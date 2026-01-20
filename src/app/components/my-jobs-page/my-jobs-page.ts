import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Layout } from '../layout/layout';
import { JobService } from '../../services/job/job.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
	selector: 'app-my-jobs-page',
	imports: [Layout, ProgressSpinnerModule, DatePipe],
	templateUrl: './my-jobs-page.html',
	styleUrl: './my-jobs-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyJobsPage implements OnInit {
	private jobService = inject(JobService);
	private authService = inject(AuthService);

	jobs = this.jobService.items;
	loading = this.jobService.loading;

	private userId = computed(() => this.authService.userData()?.id);

	ngOnInit() {
		const userId = this.userId();
		if (userId) {
			this.jobService.getByUserId(userId);
		}
	}
}
