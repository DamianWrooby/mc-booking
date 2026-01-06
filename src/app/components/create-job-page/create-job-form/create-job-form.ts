import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { JobFormModel, JobFormSubmitModel } from '../../../models/job-form.model';
import { AuthService } from '../../../services/auth/auth.service';
import { MessageService } from 'primeng/api';

const initialFormValues: JobFormModel = {
	title: '',
	description: '',
	location: '',
	startDate: null,
	endDate: null,
};

@Component({
	selector: 'app-create-job-form',
	imports: [FormsModule, InputTextModule, DatePickerModule, TextareaModule, ButtonModule, MessageModule],
	templateUrl: './create-job-form.html',
	styleUrl: './create-job-form.css',
})
export class CreateJobForm {
	private auth = inject(AuthService);
	private messageService = inject(MessageService);

	loading = input<boolean>(false);
	formSubmission = output<JobFormSubmitModel>();

	formModel: JobFormModel = initialFormValues;

	userProfile = this.auth.userProfile;

	
	onSubmit(form: NgForm) {
		this.validateForm(form);
		
		const formValues: JobFormModel = form.form.value;
		const submitValues = this.mapFormValuesToSubmitValues(formValues);
		this.formSubmission.emit(submitValues);
		this.resetForm(form);
		this.displaySuccessToast();
	}

	private resetForm(form: NgForm) {
		this.formModel = initialFormValues;
		form.resetForm();
	}

	private validateForm(form: NgForm) {
		if (form.invalid) {
			form.control.markAllAsTouched();
			return;
		}
	}

	private displaySuccessToast() {
		this.messageService.add({ severity: 'success', summary: 'Sukces', detail: 'Wydarzenie dodano pomyślnie' });
	}

	private mapFormValuesToSubmitValues(formValues: JobFormModel): JobFormSubmitModel {
		return {
			title: formValues.title,
			description: formValues.description,
			location: formValues.location,
			start_date: formValues.startDate?.toISOString() ?? '',
			end_date: formValues.endDate?.toISOString() ?? '',
			created_by: this.userProfile()?.id ?? '',
		};
	}
}
