# Job Reports Feature Implementation Plan

## Overview
Implement a job reports system where employees fill out reports for completed jobs (wage, kilometers, tools, meals, overtime, notes), and managers/admins review and accept them. Reports are auto-created with status NEW when a job's end date passes.

## Current State Analysis
- `JobReport` table exists in DB with a per-day schema (`job_day_id`, `hours_worked`, `hourly_rate`) — needs restructuring to per-job with text fields
- DTO and Command types exist for the old schema but are unused in any component or service
- No `JobReportService` exists
- Card layout pattern is inline HTML (not a shared component) in `job-list-page` and `my-jobs-page`
- `JobService.getByUserId()` queries through `JobAssignment` table using Supabase FK embedding

## Desired End State
- `/reports` page: employees see completed jobs as cards with status badges (NEW/SUBMITTED/ACCEPTED). Click to fill form. Save changes status to SUBMITTED.
- `/reports-review` page: managers/admins see all SUBMITTED reports with employee names. Can mark as ACCEPTED.
- Reports auto-created (inserted into DB) when employee loads the reports page and has completed jobs without reports.
- Accepted reports are read-only for employees.
- Navigation entries in bottom nav "More" menu.

## What We're NOT Doing
- Database migration (user runs SQL separately)
- Per-day reports (simplified to per-job)
- Extracting a shared card component (follow existing inline pattern)
- Email/push notifications for report status changes

## Implementation Approach
4 phases: types → service → reports page → review page. Each phase is independently testable.

---

## Phase 1: Update TypeScript Types

### Overview
Update `database.types.ts`, `dto.types.ts`, and `command.types.ts` to match the new `JobReport` schema.

### Changes Required:

#### 1. Database Types
**File**: `src/app/supabase/database.types.ts`
**Changes**: Replace the `JobReport` table definition (lines 174-217) with the new schema.

```typescript
JobReport: {
  Row: {
    id: string
    job_id: string
    user_id: string
    wage_rate: string
    kilometers: string | null
    tools: string | null
    meals: string | null
    overtime: string | null
    notes: string | null
    status: string
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    job_id: string
    user_id: string
    wage_rate: string
    kilometers?: string | null
    tools?: string | null
    meals?: string | null
    overtime?: string | null
    notes?: string | null
    status?: string
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    job_id?: string
    user_id?: string
    wage_rate?: string
    kilometers?: string | null
    tools?: string | null
    meals?: string | null
    overtime?: string | null
    notes?: string | null
    status?: string
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "JobReport_job_id_fkey"
      columns: ["job_id"]
      isOneToOne: false
      referencedRelation: "Job"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "JobReport_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "Profile"
      referencedColumns: ["id"]
    },
  ]
}
```

#### 2. DTO Types
**File**: `src/app/types/dto.types.ts`
**Changes**:
- `JobReportDto` stays as `Tables<'JobReport'>` (no change needed, it auto-derives)
- Remove `JobDayWithReportsDto` (line 51-53) — references old `job_day_id` pattern
- Remove `JobDayWithDetailedReportsDto` (line 61-63) — same reason
- Remove `JobWithFullDetailsDto` (line 83-87) — references removed types
- Add new composite DTO for report with embedded Job data:

```typescript
/** Job report with embedded job details */
export type JobReportWithJobDto = JobReportDto & {
  Job: JobDto;
};

/** Job report with embedded job and user profile (for manager review) */
export type JobReportWithJobAndUserDto = JobReportDto & {
  Job: JobDto;
  Profile: ProfileDto;
};
```

#### 3. Command Types
**File**: `src/app/types/command.types.ts`
**Changes**: Update the JobReport commands section (lines 113-130):

```typescript
// =============================================================================
// Job Report Commands
// =============================================================================

/**
 * Command to create a new job report.
 * Omits server-generated fields (id, created_at, updated_at)
 */
export type CreateJobReportCommand = Omit<
  TablesInsert<'JobReport'>,
  'id' | 'created_at' | 'updated_at'
>;

/** Command to update an existing job report (form fields only) */
export type UpdateJobReportCommand = Omit<
  TablesUpdate<'JobReport'>,
  'id' | 'created_at' | 'updated_at' | 'user_id' | 'job_id'
>;
```

### Success Criteria:
- [x] `npm run build` passes with no type errors
- [x] No references to `job_day_id` remain in type files

---

## Phase 2: JobReport Service

### Overview
Create `JobReportService` following the `AvailabilityService` signal-based pattern.

### Changes Required:

#### 1. Create Service
**File**: `src/app/services/job-report/job-report.service.ts` (new)

```typescript
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

    // Step 1: Get user's completed job assignments (end_date < today)
    const today = new Date().toISOString().split('T')[0];

    from(
      supabase
        .from('JobAssignment')
        .select('job_id, Job(*)')
        .eq('user_id', userId)
        .lte('Job.end_date', today)
    )
      .pipe(
        map(({ data, error }) => {
          if (error) throw error;
          return (data ?? [])
            .filter((a) => a.Job !== null)
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
    // Fetch existing reports for this user
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
          // Auto-create NEW reports for missing jobs
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
```

### Success Criteria:
- [x] Service compiles without errors
- [x] `npm run build` passes

---

## Phase 3: Reports Page (Employee View)

### Overview
Create the `/reports` page where employees see their completed jobs and fill out report forms.

### Changes Required:

#### 1. Create Component
**File**: `src/app/components/reports-page/reports-page.ts` (new)

Key patterns:
- `inject()` for `JobReportService`, `AuthService`
- `computed()` for `userId`
- `ngOnInit` calls `jobReportService.loadUserReports(userId)`
- `selectedReport` signal for the currently open form
- Form fields as plain class properties: `wageRate`, `kilometers`, `tools`, `meals`, `overtime`, `notes`
- `openReport(report)` populates form fields from the report
- `saveReport()` calls `jobReportService.submitReport()` with form data
- `isReadOnly` computed based on `selectedReport?.status === 'ACCEPTED'`

```typescript
@Component({
  selector: 'app-reports-page',
  imports: [Layout, ProgressSpinnerModule, ButtonModule, DatePipe, FormsModule, InputTextModule, TextareaModule, TagModule],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage implements OnInit {
  private reportService = inject(JobReportService);
  private authService = inject(AuthService);

  reports = this.reportService.items;
  loading = this.reportService.loading;
  selectedReport = signal<JobReportWithJobDto | null>(null);

  private userId = computed(() => this.authService.userData()?.id);

  // Form fields (plain class properties for template-driven forms)
  wageRate = '';
  kilometers = '';
  tools = '';
  meals = '';
  overtime = '';
  notes = '';

  ngOnInit() {
    const userId = this.userId();
    if (userId) {
      this.reportService.loadUserReports(userId);
    }
  }

  openReport(report: JobReportWithJobDto): void {
    this.selectedReport.set(report);
    this.wageRate = report.wage_rate ?? '';
    this.kilometers = report.kilometers ?? '';
    this.tools = report.tools ?? '';
    this.meals = report.meals ?? '';
    this.overtime = report.overtime ?? '';
    this.notes = report.notes ?? '';
  }

  closeForm(): void {
    this.selectedReport.set(null);
  }

  isReadOnly(): boolean {
    return this.selectedReport()?.status === 'ACCEPTED';
  }

  saveReport(): void {
    const report = this.selectedReport();
    if (!report || !this.wageRate.trim()) return;

    this.reportService.submitReport(report.id, {
      wage_rate: this.wageRate,
      kilometers: this.kilometers || null,
      tools: this.tools || null,
      meals: this.meals || null,
      overtime: this.overtime || null,
      notes: this.notes || null,
    });
    this.selectedReport.set(null);
  }

  getStatusSeverity(status: string): string {
    switch (status) {
      case 'NEW': return 'warn';
      case 'SUBMITTED': return 'info';
      case 'ACCEPTED': return 'success';
      default: return 'secondary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'NEW': return 'Nowy';
      case 'SUBMITTED': return 'Wysłany';
      case 'ACCEPTED': return 'Zaakceptowany';
      default: return status;
    }
  }
}
```

#### 2. Create Template
**File**: `src/app/components/reports-page/reports-page.html` (new)

Structure:
- Card list (similar to my-jobs-page) with status badge (PrimeNG `p-tag`)
- Cards have border-left color based on status: amber for NEW, blue for SUBMITTED, green for ACCEPTED
- Click card → shows inline form below the list (or replaces list)
- Form with text inputs for each field, save/cancel buttons
- Wage field is required, rest optional

```html
<app-layout>
  <h1 class="text-2xl font-bold mb-6">Raporty</h1>

  @if (loading()) {
    <div class="flex justify-center py-12">
      <p-progress-spinner strokeWidth="4"></p-progress-spinner>
    </div>
  } @else if (selectedReport(); as report) {
    <!-- Report Form -->
    <div class="mb-4">
      <button pButton label="Powrót do listy" icon="pi pi-arrow-left"
        class="p-button-text" (click)="closeForm()"></button>
    </div>
    <h2 class="text-lg font-semibold mb-4">{{ report.Job.title }}</h2>
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="font-medium text-sm">Stawka *</label>
        <input pInputText [(ngModel)]="wageRate" placeholder="Np. 1.5x"
          [disabled]="isReadOnly()" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-medium text-sm">Kilometry</label>
        <input pInputText [(ngModel)]="kilometers" placeholder="Np. 120 km"
          [disabled]="isReadOnly()" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-medium text-sm">Narzędzia</label>
        <input pInputText [(ngModel)]="tools" placeholder="Np. Wiertarka, klucze"
          [disabled]="isReadOnly()" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-medium text-sm">Posiłki</label>
        <input pInputText [(ngModel)]="meals" placeholder="Np. 2 obiady"
          [disabled]="isReadOnly()" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-medium text-sm">Nadgodziny</label>
        <input pInputText [(ngModel)]="overtime" placeholder="Np. 3h"
          [disabled]="isReadOnly()" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="font-medium text-sm">Uwagi</label>
        <textarea pTextarea [(ngModel)]="notes" rows="3" placeholder="Dodatkowe uwagi"
          [disabled]="isReadOnly()"></textarea>
      </div>
      @if (!isReadOnly()) {
        <p-button label="Zapisz raport" icon="pi pi-check"
          [disabled]="!wageRate.trim()" (onClick)="saveReport()"></p-button>
      }
    </div>
  } @else if (reports().length === 0) {
    <div class="text-center py-12 text-gray-500">
      <p>Brak raportów do wyświetlenia</p>
    </div>
  } @else {
    <ul class="flex flex-col gap-4">
      @for (report of reports(); track report.id) {
        <li class="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          [class.border-l-4]="true"
          [class.border-l-amber-500]="report.status === 'NEW'"
          [class.border-l-blue-500]="report.status === 'SUBMITTED'"
          [class.border-l-green-500]="report.status === 'ACCEPTED'"
          (click)="openReport(report)">
          <div class="flex justify-between items-start">
            <h2 class="text-lg font-semibold mb-2">{{ report.Job.title }}</h2>
            <p-tag [value]="getStatusLabel(report.status)"
              [severity]="getStatusSeverity(report.status)"></p-tag>
          </div>
          <div class="flex flex-col gap-1 text-sm text-surface-600 dark:text-surface-400">
            <p>
              <span class="font-medium">Termin:</span>
              {{ report.Job.start_date | date:'d MMM yyyy' }} - {{ report.Job.end_date | date:'d MMM yyyy' }}
            </p>
            <p>
              <span class="font-medium">Miejsce:</span>
              {{ report.Job.location }}
            </p>
          </div>
        </li>
      }
    </ul>
  }
</app-layout>
```

#### 3. Create Empty CSS
**File**: `src/app/components/reports-page/reports-page.css` (new, empty)

### Success Criteria:
- [x] `npm run build` passes
- [ ] Cards render with correct status colors
- [ ] Form opens on card click, populates existing data
- [ ] Save submits and changes status to SUBMITTED
- [ ] Accepted reports show read-only form

---

## Phase 4: Reports Review Page (Manager/Admin)

### Overview
Create `/reports-review` page for managers/admins to see all reports and accept them.

### Changes Required:

#### 1. Create Component
**File**: `src/app/components/reports-review-page/reports-review-page.ts` (new)

Similar to reports-page but:
- Calls `jobReportService.loadAllReports()`
- Uses `allItems` signal
- Shows employee name on each card (from `Profile` embed)
- "Zaakceptuj" button calls `jobReportService.acceptReport(id)`
- Can filter by status (optional, could add later)
- Shows report details inline when clicked (read-only view of what employee submitted)

#### 2. Create Template
**File**: `src/app/components/reports-review-page/reports-review-page.html` (new)

Cards show: job title, employee username, status badge, report field values (wage, km, tools, etc.), and an "Zaakceptuj" button for non-accepted reports.

#### 3. Create Empty CSS
**File**: `src/app/components/reports-review-page/reports-review-page.css` (new, empty)

#### 4. Add Routes
**File**: `src/app/app.routes.ts`

Add two new routes:
```typescript
{
  path: 'reports',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./components/reports-page/reports-page').then((mod) => mod.ReportsPage),
},
{
  path: 'reports-review',
  canActivate: [authGuard, roleGuard],
  loadComponent: () =>
    import('./components/reports-review-page/reports-review-page').then(
      (mod) => mod.ReportsReviewPage
    ),
  data: { allowedRoles: ['ADMIN', 'MANAGER'] },
},
```

#### 5. Update Bottom Nav
**File**: `src/app/components/bottom-nav/bottom-nav.ts`

Add `isManagerOrAdmin` computed:
```typescript
isManagerOrAdmin = computed(() => {
  const role = this.authService.userProfile()?.role;
  return role === 'ADMIN' || role === 'MANAGER';
});
```

Update `isMoreActive` to include `/reports`:
```typescript
isMoreActive = computed(() => {
  const url = this.currentUrl() ?? '';
  return (
    url.startsWith('/my-account') ||
    url.startsWith('/users-management') ||
    url.startsWith('/availability') ||
    url.startsWith('/reports')
  );
});
```

**File**: `src/app/components/bottom-nav/bottom-nav.html`

Add after "Dostępność" button:
```html
<div class="h-px my-1 bg-surface-200 dark:bg-surface-700"></div>
<button
  pButton
  label="Raporty"
  icon="pi pi-file"
  class="p-button-text justify-start w-full"
  (click)="navigateTo('/reports')"
></button>
@if (isManagerOrAdmin()) {
  <div class="h-px my-1 bg-surface-200 dark:bg-surface-700"></div>
  <button
    pButton
    label="Przegląd raportów"
    icon="pi pi-file-check"
    class="p-button-text justify-start w-full"
    (click)="navigateTo('/reports-review')"
  ></button>
}
```

### Success Criteria:
- [x] `npm run build` passes
- [ ] `/reports` accessible to all authenticated users
- [ ] `/reports-review` accessible only to ADMIN/MANAGER
- [ ] Both nav entries appear correctly in More menu
- [ ] Accept button changes report status and disables further edits

---

## Testing Strategy

### Manual Testing Steps:
1. Log in as employee → navigate to Reports → verify completed jobs show as NEW cards
2. Click a NEW card → fill wage (required) + optional fields → save → verify status changes to SUBMITTED
3. Re-open submitted report → verify data persists, form still editable
4. Log in as manager → navigate to "Przegląd raportów" → verify all submitted reports visible
5. Accept a report → verify status changes to ACCEPTED
6. Log back in as employee → verify accepted report form is read-only
7. Verify "Raporty" appears for all users, "Przegląd raportów" only for manager/admin

### Edge Cases:
- Employee with no completed jobs → empty state message
- Employee with completed jobs but all already reported → all cards show with their statuses
- Multiple employees → review page shows all with employee names
- Accepted report → employee can view but not modify

## Performance Considerations
- Auto-creating reports uses two sequential queries (fetch assignments, then batch insert missing). This is acceptable for the expected data volume.
- Supabase FK embedding (`Job(*)`, `Profile(*)`) keeps queries to a single round-trip per view.
