import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { Layout } from '../layout/layout';
import { AuthService } from '../../services/auth/auth.service';
import { AvailabilityService } from '../../services/availability/availability.service';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalDateStr = (d: Date) =>
	`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseLocalDate = (str: string) => {
	const [year, month, day] = str.split('T')[0].split('-').map(Number);
	return new Date(year, month - 1, day);
};

@Component({
	selector: 'app-availability-page',
	imports: [Layout, FormsModule, DatePickerModule, ButtonModule, InputTextModule],
	templateUrl: './availability-page.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailabilityPage {
	private auth = inject(AuthService);
	private availabilityService = inject(AvailabilityService);

	userProfile = this.auth.userProfile;
	availabilities = this.availabilityService.items;
	loading = this.availabilityService.loading;

	readonly today = new Date();

	// Form state
	dateRange: Date[] | null = null;
	note = '';

	/** Set of "YYYY-MM-DD" strings for all days covered by stored availability ranges. */
	availableDateStrings = computed(() => {
		const dates = new Set<string>();
		for (const avail of this.availabilities()) {
			const from = parseLocalDate(avail.date_from);
			const to = parseLocalDate(avail.date_to);
			for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
				dates.add(toLocalDateStr(d));
			}
		}
		return dates;
	});

	constructor() {
		let fetched = false;
		effect(() => {
			const profile = this.userProfile();
			if (profile && !fetched) {
				fetched = true;
				this.availabilityService.getByUserId(profile.id);
			}
		});
	}

	/** Called from the date template — checks if a calendar cell should be highlighted. */
	isDateAvailable(date: { day: number; month: number; year: number }): boolean {
		const dateStr = `${date.year}-${pad(date.month + 1)}-${pad(date.day)}`;
		return this.availableDateStrings().has(dateStr);
	}

	addAvailability(): void {
		if (!this.dateRange || this.dateRange.length < 2 || !this.dateRange[0] || !this.dateRange[1])
			return;

		this.availabilityService.create({
			date_from: toLocalDateStr(this.dateRange[0]),
			date_to: toLocalDateStr(this.dateRange[1]),
			note: this.note || undefined,
		});

		this.dateRange = null;
		this.note = '';
	}

	deleteAvailability(id: string): void {
		this.availabilityService.delete(id);
	}

	formatDateRange(dateFrom: string, dateTo: string): string {
		const from = parseLocalDate(dateFrom);
		const to = parseLocalDate(dateTo);
		const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

		if (dateFrom === dateTo) return from.toLocaleDateString('pl-PL', opts);
		return `${from.toLocaleDateString('pl-PL', opts)} – ${to.toLocaleDateString('pl-PL', opts)}`;
	}
}
