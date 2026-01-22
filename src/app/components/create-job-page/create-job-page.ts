import { Component, computed, inject } from '@angular/core';
import { Layout } from '../layout/layout';
import { JobForm } from '../job-form/job-form';
import { AuthService } from '../../services/auth/auth.service';
import { JobService } from '../../services/job/job.service';
import { JobAssignmentService } from '../../services/job-assignment/job-assignment.service';
import { JobFormSubmitModel } from '../../models/job-form.model';

@Component({
	selector: 'app-create-job-page',
	imports: [Layout, JobForm],
	templateUrl: './create-job-page.html',
	styleUrl: './create-job-page.css',
})
export class CreateJobPage {
	private auth = inject(AuthService);
	private jobService = inject(JobService);
	private jobAssignmentService = inject(JobAssignmentService);

	startDate: Date[] | undefined;
	endDate: Date[] | undefined;
	loading = computed(() => this.jobService.loading() || this.jobAssignmentService.loading());

	userProfile = this.auth.userProfile;

	createJob(formValues: JobFormSubmitModel) {
		const { assigned_user_ids, ...jobData } = formValues;

		this.jobService.create(jobData, (createdJob) => {
			if (assigned_user_ids.length > 0) {
				this.jobAssignmentService.createBulk(
					createdJob.id,
					assigned_user_ids,
					this.userProfile()?.id ?? ''
				);
			}
		});
	}
}
