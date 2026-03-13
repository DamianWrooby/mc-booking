import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ErrorService } from '../error/error.service';
import { AuthService } from '../auth/auth.service';
import { supabase } from '../../supabase/supabase-client';
import type { Tables } from '../../supabase/database.types';
import type { UpdateJobReportCommand } from '../../types/command.types';
import type { JobReportWithJobDto, JobReportWithJobAndUserDto } from '../../types/dto.types';

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
   * for completed jobs that don't have a report yet.
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
   * then fetch all user reports.
   */
  private ensureReportsExist(
    userId: string,
    completedJobs: { job_id: string; job: Tables<'Job'> }[]
  ): void {
    from(
      supabase
        .from('JobReport')
        .select('*, Job(*)')
        .eq('user_id', userId)
    )
      .pipe(
        map(({ data, error }) => {
          if (error) throw error;
          return (data ?? []) as JobReportWithJobDto[];
        }),
        catchError(() => {
          this.setError('Nie udało się załadować raportów');
          return of([] as JobReportWithJobDto[]);
        })
      )
      .subscribe((existingReports) => {
        const existingJobIds = new Set(existingReports.map((r) => r.job_id));
        const missingJobs = completedJobs.filter((j) => !existingJobIds.has(j.job_id));

        if (missingJobs.length > 0) {
          const newReports = missingJobs.map((j) => ({
            job_id: j.job_id,
            user_id: userId,
            wage_rate: '',
            status: 'NEW',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          from(
            supabase
              .from('JobReport')
              .insert(newReports)
              .select('*, Job(*)')
          )
            .pipe(
              map(({ data, error }) => {
                if (error) throw error;
                return (data ?? []) as JobReportWithJobDto[];
              }),
              catchError(() => of([] as JobReportWithJobDto[]))
            )
            .subscribe((created) => {
              this.state.update((s) => ({
                ...s,
                items: [...existingReports, ...created],
                loading: false,
              }));
            });
        } else {
          this.state.update((s) => ({
            ...s,
            items: existingReports,
            loading: false,
          }));
        }
      });
  }

  /** Load all reports (for manager/admin review page) */
  loadAllReports(): void {
    this.setLoading(true);
    this.resetError();

    from(
      supabase
        .from('JobReport')
        .select('*, Job(*), Profile(*)')
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

  /** Update report fields and set status to SUBMITTED */
  submitReport(id: string, changes: UpdateJobReportCommand): void {
    this.setLoading(true);
    this.resetError();

    from(
      supabase
        .from('JobReport')
        .update({
          ...changes,
          status: 'SUBMITTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, Job(*)')
        .single()
    )
      .pipe(
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
        .select('*, Job(*), Profile(*)')
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
        .select('*, Job(*), Profile(*)')
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
