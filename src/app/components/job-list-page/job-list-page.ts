import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Layout } from '../layout/layout';
import { JobListFilters, JobFilters } from './job-list-filters/job-list-filters';
import { JobService } from '../../services/job/job.service';
import { UserService } from '../../services/user/user.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
	selector: 'app-job-list-page',
	imports: [Layout, JobListFilters, ProgressSpinnerModule, ButtonModule, TooltipModule, DatePipe],
	templateUrl: './job-list-page.html',
	styleUrl: './job-list-page.css',
})
export class JobListPage implements OnInit {
	private jobService = inject(JobService);
	private userService = inject(UserService);
	private authService = inject(AuthService);
	private router = inject(Router);

	users = this.userService.items;
	loading = computed(() => this.jobService.loading() || this.userService.loading());

	canEdit = computed(() => {
		const profile = this.authService.userProfile();
		return profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
	});

	private filters = signal<JobFilters>({ dateRange: null, createdBy: null });

	filteredJobs = computed(() => {
		let jobs = this.jobService.items();
		const { dateRange, createdBy } = this.filters();

		if (createdBy) {
			jobs = jobs.filter((j) => j.created_by === createdBy);
		}

		if (dateRange?.[0] && dateRange?.[1]) {
			jobs = jobs.filter((j) => {
				const start = new Date(j.start_date);
				return start >= dateRange[0] && start <= dateRange[1];
			});
		}

		return jobs;
	});

	ngOnInit() {
		this.jobService.getAll();
		this.userService.getAll();
	}

	onFiltersChange(filters: JobFilters) {
		this.filters.set(filters);
	}

	getUserName(userId: string): string {
		const user = this.users().find((u) => u.id === userId);
		return user?.username ?? 'Nieznany';
	}

	editJob(jobId: string): void {
		this.router.navigate(['/edit-job', jobId]);
	}
}
