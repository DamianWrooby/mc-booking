import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

@Component({
	selector: 'app-create-job-form',
	imports: [FormsModule, DatePickerModule, InputTextModule, TextareaModule, ButtonModule, MessageModule],
	templateUrl: './create-job-form.html',
	styleUrl: './create-job-form.css',
})
export class CreateJobForm {
	formData: {
		title: string;
		description: string;
		location: string;
		startDate?: Date | null;
		endDate?: Date | null;
	} = {
		title: '',
		description: '',
		location: '',
		startDate: null,
		endDate: null,
	};

	loading = signal(false);

	createJob() {
		this.loading.set(true);
		console.log('Creating job with data:', this.formData);
		this.loading.set(false);
	}
}
