import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ProfileDto } from '../../../types';

export interface JobFilters {
	dateRange: [Date, Date] | null;
	createdBy: string | null;
}

@Component({
	selector: 'app-job-list-filters',
	imports: [FormsModule, DatePickerModule, Select, ButtonModule],
	templateUrl: './job-list-filters.html',
	styleUrl: './job-list-filters.css',
})
export class JobListFilters {
	users = input<ProfileDto[]>([]);
	loading = input<boolean>(false);
	filtersChange = output<JobFilters>();

	dateRange = signal<Date[] | null>(null);
	selectedUserId = signal<string | null>(null);

	onDateRangeChange(value: Date[] | null) {
		this.dateRange.set(value);
		this.emitFilters();
	}

	onUserChange(userId: string | null) {
		this.selectedUserId.set(userId);
		this.emitFilters();
	}

	clearFilters() {
		this.dateRange.set(null);
		this.selectedUserId.set(null);
		this.emitFilters();
	}

	private emitFilters() {
		const range = this.dateRange();
		this.filtersChange.emit({
			dateRange: range && range.length === 2 ? [range[0], range[1]] : null,
			createdBy: this.selectedUserId(),
		});
	}
}
