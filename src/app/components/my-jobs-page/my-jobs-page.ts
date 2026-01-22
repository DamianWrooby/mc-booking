import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Layout } from '../layout/layout';
import { JobService } from '../../services/job/job.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
	selector: 'app-my-jobs-page',
	imports: [Layout, ProgressSpinnerModule, ButtonModule, TooltipModule, DatePipe],
	templateUrl: './my-jobs-page.html',
	styleUrl: './my-jobs-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyJobsPage implements OnInit {
	private jobService = inject(JobService);
	private authService = inject(AuthService);
	private router = inject(Router);

	jobs = this.jobService.items;
	loading = this.jobService.loading;

	private userId = computed(() => this.authService.userData()?.id);

	canEdit = computed(() => {
		const profile = this.authService.userProfile();
		return profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
	});

	ngOnInit() {
		const userId = this.userId();
		if (userId) {
			this.jobService.getByUserId(userId);
		}
	}

	editJob(jobId: string): void {
		this.router.navigate(['/edit-job', jobId]);
	}
}
