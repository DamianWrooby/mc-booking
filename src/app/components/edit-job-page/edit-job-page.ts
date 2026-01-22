import { Component, ChangeDetectionStrategy, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Layout } from '../layout/layout';
import { JobForm } from '../job-form/job-form';
import { AuthService } from '../../services/auth/auth.service';
import { JobService } from '../../services/job/job.service';
import { JobAssignmentService } from '../../services/job-assignment/job-assignment.service';
import { JobFormSubmitModel } from '../../models/job-form.model';
import type { ProfileDto } from '../../types';

@Component({
	selector: 'app-edit-job-page',
	imports: [Layout, JobForm, ProgressSpinnerModule],
	templateUrl: './edit-job-page.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditJobPage implements OnInit {
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private auth = inject(AuthService);
	private jobService = inject(JobService);
	private jobAssignmentService = inject(JobAssignmentService);

	userProfile = this.auth.userProfile;
	job = this.jobService.selectedItem;
	jobLoading = this.jobService.loading;
	assignmentLoading = this.jobAssignmentService.loading;

	assignedUsers = signal<ProfileDto[]>([]);
	initialLoadComplete = signal(false);

	loading = computed(
		() => this.jobLoading() || this.assignmentLoading() || !this.initialLoadComplete()
	);

	constructor() {
		effect(() => {
			const job = this.job();
			if (job && !this.initialLoadComplete()) {
				this.jobAssignmentService.getByJobIdWithUsers(job.id, (assignments) => {
					this.assignedUsers.set(assignments.map((a) => a.user));
					this.initialLoadComplete.set(true);
				});
			}
		});
	}

	ngOnInit(): void {
		const jobId = this.route.snapshot.paramMap.get('id');
		if (jobId) {
			this.jobService.getById(jobId);
		} else {
			this.router.navigate(['/job-list']);
		}
	}

	updateJob(formValues: JobFormSubmitModel): void {
		const job = this.job();
		if (!job) return;

		const { assigned_user_ids, created_by, ...jobData } = formValues;

		this.jobService.update(job.id, jobData, () => {
			this.jobAssignmentService.replaceAssignments(
				job.id,
				assigned_user_ids,
				this.userProfile()?.id ?? '',
				() => {
					this.router.navigate(['/job-list']);
				}
			);
		});
	}
}
