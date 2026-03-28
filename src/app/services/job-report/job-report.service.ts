import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { ErrorService } from '../error/error.service';
import { AuthService } from '../auth/auth.service';
import { supabase } from '../../supabase/supabase-client';
import type { Tables } from '../../supabase/database.types';
import type { UpdateJobReportCommand } from '../../types/command.types';
import type {
  JobReportWithJobDto,
  JobReportWithJobAndUserDto,
  JobReportDayDto,
} from '../../types/dto.types';

type JobReport = Tables<'JobReport'>;

interface JobReportState {
  items: JobReportWithJobDto[];
  allItems: JobReportWithJobAndUserDto[];
  loading: boolean;
  error: string | null;
}

const initialState: JobReportState = {
  items: [],
  allItems: [],
  loading: false,
  error: null,
};

/** Generate all dates between start and end (inclusive) as YYYY-MM-DD strings */
function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

@Injectable({
  providedIn: 'root',
})
export class JobReportService {
  private errorService = inject(ErrorService);
  private auth = inject(AuthService);

  private readonly state = signal<JobReportState>(initialState);

  readonly items = computed(() => this.state().items);
  readonly allItems = computed(() => this.state().allItems);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);

  constructor() {
    effect(() => {
      const error = this.error();
      if (error) {
        this.errorService.showError(error);
      }
    });
  }

  /**
   * Load reports for current user. Also auto-creates NEW reports
   * for completed jobs that don't have a report yet, and ensures
   * per-day entries exist for each report.
   */
  loadUserReports(userId: string): void {
    this.setLoading(true);
    this.resetError();

    const today = new Date();

    from(
      supabase
        .from('JobAssignment')
        .select('job_id, Job(*)')
        .eq('user_id', userId)
    )
      .pipe(
        map(({ data, error }) => {
          if (error) throw error;
          return (data ?? [])
            .filter(
              (a) => a.Job !== null && new Date((a.Job as Tables<'Job'>).end_date) < today
            )
            .map((a) => ({ job_id: a.job_id, job: a.Job as Tables<'Job'> }));
        }),
        catchError(() => {
          this.setError('Nie udało się załadować zakończonych wydarzeń');
          return of([]);
        })
      )
      .subscribe((completedJobs) => {
        if (completedJobs.length === 0) {
          this.state.update((s) => ({ ...s, items: [], loading: false }));
          return;
        }
        this.ensureReportsExist(userId, completedJobs);
      });
  }

  /**
   * Auto-create reports for completed jobs that don't have one,
   * then ensure per-day entries exist, then fetch all user reports.
   */
  private ensureReportsExist(
    userId: string,
    completedJobs: { job_id: string; job: Tables<'Job'> }[]
  ): void {
    from(
      supabase
        .from('JobReport')
        .select('*, Job(*), JobReportDay(*)')
        .eq('user_id', userId)
    )
      .pipe(
        map(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as JobReportWithJobDto[];
        }),
        switchMap((existingReports) => {
          const existingJobIds = new Set(existingReports.map((r) => r.job_id));
          const missingJobs = completedJobs.filter((j) => !existingJobIds.has(j.job_id));

          if (missingJobs.length > 0) {
            const newReports = missingJobs.map((j) => ({
              job_id: j.job_id,
              user_id: userId,
              status: 'NEW',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            return from(
              supabase
                .from('JobReport')
                .insert(newReports)
                .select('*, Job(*), JobReportDay(*)')
            ).pipe(
              map(({ data, error }) => {
                if (error) throw error;
                return [...existingReports, ...(data ?? []) as JobReportWithJobDto[]];
              })
            );
          }
          return of(existingReports);
        }),
        switchMap((allReports) => this.ensureReportDaysExist(allReports, completedJobs)),
        catchError(() => {
          this.setError('Nie udało się załadować raportów');
          return of([] as JobReportWithJobDto[]);
        })
      )
      .subscribe((reports) => {
        this.state.update((s) => ({
          ...s,
          items: reports,
          loading: false,
        }));
      });
  }

  /**
   * For each report, check if day entries exist for every date in the job range.
   * Create missing ones and return updated reports.
   */
  private ensureReportDaysExist(
    reports: JobReportWithJobDto[],
    completedJobs: { job_id: string; job: Tables<'Job'> }[]
  ) {
    const jobMap = new Map(completedJobs.map((j) => [j.job_id, j.job]));
    const missingDays: { report_id: string; date: string; wage_rate: string }[] = [];

    for (const report of reports) {
      const job = jobMap.get(report.job_id) ?? report.Job;
      if (!job) continue;

      const expectedDates = generateDateRange(job.start_date, job.end_date);
      const existingDates = new Set((report.JobReportDay ?? []).map((d) => d.date));

      for (const date of expectedDates) {
        if (!existingDates.has(date)) {
          missingDays.push({ report_id: report.id, date, wage_rate: '' });
        }
      }
    }

    if (missingDays.length === 0) {
      return of(reports);
    }

    return from(supabase.from('JobReportDay').insert(missingDays).select()).pipe(
      switchMap(() => {
        // Re-fetch to get updated day entries
        const userId = reports[0]?.user_id;
        if (!userId) return of(reports);

        return from(
          supabase
            .from('JobReport')
            .select('*, Job(*), JobReportDay(*)')
            .eq('user_id', userId)
        ).pipe(
          map(({ data, error }) => {
            if (error) throw error;
            return (data ?? []) as JobReportWithJobDto[];
          })
        );
      }),
      catchError(() => of(reports))
    );
  }

  /** Load all reports (for manager/admin review page) */
  loadAllReports(): void {
    this.setLoading(true);
    this.resetError();

    from(
      supabase
        .from('JobReport')
        .select('*, Job(*), Profile(*), JobReportDay(*)')
        .order('updated_at', { ascending: false })
    )
      .pipe(
        map(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as JobReportWithJobAndUserDto[];
        }),
        catchError(() => {
          this.setError('Nie udało się załadować raportów');
          return of([] as JobReportWithJobAndUserDto[]);
        })
      )
      .subscribe((items) => {
        this.state.update((s) => ({ ...s, allItems: items, loading: false }));
      });
  }

  /**
   * Submit report: save event-level fields + per-day entries, then set status to SUBMITTED.
   */
  submitReport(id: string, changes: UpdateJobReportCommand, days: JobReportDayDto[]): void {
    this.setLoading(true);
    this.resetError();

    // First upsert all day entries
    const dayUpserts = days.map((d) => ({
      id: d.id,
      report_id: d.report_id,
      date: d.date,
      wage_rate: d.wage_rate,
      tools: d.tools,
    }));

    from(
      supabase.from('JobReportDay').upsert(dayUpserts, { onConflict: 'report_id,date' })
    )
      .pipe(
        switchMap(() =>
          from(
            supabase
              .from('JobReport')
              .update({
                ...changes,
                status: 'SUBMITTED',
                updated_at: new Date().toISOString(),
              })
              .eq('id', id)
              .select('*, Job(*), JobReportDay(*)')
              .single()
          )
        ),
        map(({ data, error }) => {
          if (error) throw error;
          return data as JobReportWithJobDto;
        }),
        catchError(() => {
          this.setError('Nie udało się zapisać raportu');
          return of(null);
        })
      )
      .subscribe((updated) => {
        if (!updated) return;
        this.state.update((s) => ({
          ...s,
          items: s.items.map((r) => (r.id === id ? updated : r)),
          loading: false,
        }));
      });
  }

  /** Mark report as accepted (manager/admin action) */
  acceptReport(id: string): void {
    this.setLoading(true);
    this.resetError();

    from(
      supabase
        .from('JobReport')
        .update({
          status: 'ACCEPTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, Job(*), Profile(*), JobReportDay(*)')
        .single()
    )
      .pipe(
        map(({ data, error }) => {
          if (error) throw error;
          return data as JobReportWithJobAndUserDto;
        }),
        catchError(() => {
          this.setError('Nie udało się zaakceptować raportu');
          return of(null);
        })
      )
      .subscribe((updated) => {
        if (!updated) return;
        this.state.update((s) => ({
          ...s,
          allItems: s.allItems.map((r) => (r.id === id ? updated : r)),
          loading: false,
        }));
      });
  }

  /** Revert accepted report back to SUBMITTED (manager/admin action) */
  revertReport(id: string): void {
    this.setLoading(true);
    this.resetError();

    from(
      supabase
        .from('JobReport')
        .update({
          status: 'SUBMITTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, Job(*), Profile(*), JobReportDay(*)')
        .single()
    )
      .pipe(
        map(({ data, error }) => {
          if (error) throw error;
          return data as JobReportWithJobAndUserDto;
        }),
        catchError(() => {
          this.setError('Nie udało się cofnąć statusu raportu');
          return of(null);
        })
      )
      .subscribe((updated) => {
        if (!updated) return;
        this.state.update((s) => ({
          ...s,
          allItems: s.allItems.map((r) => (r.id === id ? updated : r)),
          loading: false,
        }));
      });
  }

  private setLoading(loading: boolean) {
    this.state.update((s) => ({ ...s, loading }));
  }

  private setError(error: string | null) {
    this.state.update((s) => ({ ...s, error }));
  }

  private resetError() {
    this.setError(null);
  }
}
