import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { Layout } from '../layout/layout';
import { CreateJobForm } from './create-job-form/create-job-form';
import { AuthService } from '../../services/auth.service';

@Component({
	selector: 'app-create-job-page',
	imports: [Layout, ButtonModule, FormsModule, DatePickerModule, CreateJobForm],
	templateUrl: './create-job-page.html',
	styleUrl: './create-job-page.css',
})
export class CreateJobPage {
	private auth = inject(AuthService);


	startDate: Date[] | undefined;
	endDate: Date[] | undefined;
	loading = signal(false);

	userProfile = this.auth.userProfile;

	createJob() {
		this.loading.set(true);
		console.log('Creating job with dates:', this.startDate, this.endDate);
		this.loading.set(false);
		
	}
}
