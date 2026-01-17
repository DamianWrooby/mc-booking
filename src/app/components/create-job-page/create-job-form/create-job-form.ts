import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ChipModule } from 'primeng/chip';
import { JobFormModel, JobFormSubmitModel } from '../../../models/job-form.model';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService } from '../../../services/user/user.service';
import { MessageService } from 'primeng/api';
import type { UserProfile } from '../../../models/user.model';

const initialFormValues: JobFormModel = {
	title: '',
	description: '',
	location: '',
	startDate: null,
	endDate: null,
	assignedUsers: [],
};

@Component({
	selector: 'app-create-job-form',
	imports: [
		FormsModule,
		InputTextModule,
		DatePickerModule,
		TextareaModule,
		ButtonModule,
		MessageModule,
		AutoCompleteModule,
		ChipModule,
	],
	templateUrl: './create-job-form.html',
	styleUrl: './create-job-form.css',
})
export class CreateJobForm implements OnInit {
	private auth = inject(AuthService);
	private userService = inject(UserService);
	private messageService = inject(MessageService);

	loading = input<boolean>(false);
	formSubmission = output<JobFormSubmitModel>();

	formModel: JobFormModel = { ...initialFormValues };
	selectedUser: UserProfile | null = null;

	filteredUsers = signal<UserProfile[]>([]);

	userProfile = this.auth.userProfile;
	allUsers = this.userService.items;
	usersLoading = this.userService.loading;

	ngOnInit(): void {
		this.userService.getAll();
	}

	filterUsers(event: AutoCompleteCompleteEvent): void {
		const query = event.query.toLowerCase();
		const users = this.allUsers() ?? [];
		const selectedIds = new Set(this.formModel.assignedUsers.map((u) => u.id));

		const availableUsers = users.filter((user) => !selectedIds.has(user.id));

		if (!query) {
			this.filteredUsers.set(availableUsers);
			return;
		}

		this.filteredUsers.set(
			availableUsers.filter((user) => user.username.toLowerCase().includes(query))
		);
	}

	onUserSelect(event: { value: UserProfile }): void {
		const user = event.value;
		if (!this.formModel.assignedUsers.some((u) => u.id === user.id)) {
			this.formModel.assignedUsers = [...this.formModel.assignedUsers, user];
		}
		this.selectedUser = null;
	}

	removeUser(user: UserProfile): void {
		this.formModel.assignedUsers = this.formModel.assignedUsers.filter((u) => u.id !== user.id);
	}

	onSubmit(form: NgForm) {
		this.validateForm(form);
		
		const formValues: JobFormModel = form.form.value;
		const submitValues = this.mapFormValuesToSubmitValues(formValues);
		this.formSubmission.emit(submitValues);
		this.resetForm(form);
		this.displaySuccessToast();
	}

	private resetForm(form: NgForm) {
		this.formModel = { ...initialFormValues, assignedUsers: [] };
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
			assigned_user_ids: this.formModel.assignedUsers.map((u) => u.id),
		};
	}
}
