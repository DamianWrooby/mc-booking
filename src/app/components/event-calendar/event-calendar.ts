import { Component, inject, signal, computed, effect, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DatePicker } from 'primeng/datepicker';
import { Card } from 'primeng/card';
import { JobService } from '../../services/job/job.service';
import type { Tables } from '../../supabase/database.types';

type Job = Tables<'Job'>;

@Component({
  selector: 'app-event-calendar',
  imports: [DatePicker, Card, DatePipe],
  templateUrl: './event-calendar.html',
  styleUrl: './event-calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCalendar implements OnInit {
	private jobService = inject(JobService);

	readonly currentDate = signal<Date>(new Date());
	readonly selectedDate = signal<Date | null>(null);
	private readonly jobs = signal<Job[]>([]);

	private readonly eventColors = [
		'rgba(239, 68, 68, 0.2)', // red
		'rgba(249, 115, 22, 0.2)', // orange
		'rgba(234, 179, 8, 0.2)', // yellow
		'rgba(34, 197, 94, 0.2)', // green
		'rgba(20, 184, 166, 0.2)', // teal
		'rgba(14, 165, 233, 0.2)', // sky
		'rgba(99, 102, 241, 0.2)', // indigo
		'rgba(168, 85, 247, 0.2)', // purple
		'rgba(236, 72, 153, 0.2)', // pink
		'rgba(107, 114, 128, 0.2)', // gray
	];

	readonly jobsByDate = computed(() => {
		const jobsMap = new Map<string, Job[]>();
		this.jobs().forEach((job) => {
			const startDate = new Date(job.start_date);
			const endDate = new Date(job.end_date);

			const currentDate = new Date(startDate);
			while (currentDate <= endDate) {
				const dateKey = this.getDateKey(currentDate);
				if (!jobsMap.has(dateKey)) {
					jobsMap.set(dateKey, []);
				}
				jobsMap.get(dateKey)!.push(job);
				currentDate.setDate(currentDate.getDate() + 1);
			}
		});
		return jobsMap;
	});

	readonly selectedDateJobs = computed(() => {
		const date = this.selectedDate();
		if (!date) return [];
		return this.getJobsForDate(date);
	});

	readonly currentMonthJobs = computed(() => {
		const current = this.currentDate();
		const year = current.getFullYear();
		const month = current.getMonth();

		// Get unique jobs for the current month (avoid duplicates from multi-day jobs)
		const jobsInMonth = new Map<string, Job>();
		this.jobs().forEach((job) => {
			const startDate = new Date(job.start_date);
			const endDate = new Date(job.end_date);

			// Check if job overlaps with current month
			const monthStart = new Date(year, month, 1);
			const monthEnd = new Date(year, month + 1, 0);

			if (startDate <= monthEnd && endDate >= monthStart) {
				jobsInMonth.set(job.id, job);
			}
		});

		// Sort by start date
		return Array.from(jobsInMonth.values()).sort(
			(a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
		);
	});

	constructor() {
		// Load jobs when the service items change
		effect(() => {
			const items = this.jobService.items();
			console.log('jobs', items);
			this.jobs.set(items);
		});
	}

	ngOnInit(): void {
		// Load all jobs on component initialization
		this.jobService.getAll();
	}

	onMonthChange(event: { month?: number; year?: number }): void {
		// Update current date when month changes
		if (event.year !== undefined && event.month !== undefined) {
			this.currentDate.set(new Date(event.year, event.month, 1));
			// Clear selected date when changing months
			this.selectedDate.set(null);
		}
	}

	onDateClick(date: Date | { day: number; month: number; year: number }): void {
		const dateObj = this.normalizeDate(date);
		const currentSelected = this.selectedDate();

		// Toggle selection if clicking the same date
		if (currentSelected && this.getDateKey(currentSelected) === this.getDateKey(dateObj)) {
			this.selectedDate.set(null);
		} else if (this.hasEvents(date)) {
			this.selectedDate.set(dateObj);
		}
	}

	isSelected(date: Date | { day: number; month: number; year: number }): boolean {
		const selected = this.selectedDate();
		if (!selected) return false;
		const dateObj = this.normalizeDate(date);
		return this.getDateKey(selected) === this.getDateKey(dateObj);
	}

	hasEvents(date: Date | { day: number; month: number; year: number }): boolean {
		const dateObj = this.normalizeDate(date);
		const dateKey = this.getDateKey(dateObj);
		// console.log(dateKey, this.jobsByDate().has(dateKey));
		return this.jobsByDate().has(dateKey);
	}

	getJobsForDate(date: Date | { day: number; month: number; year: number }): Job[] {
		const dateObj = this.normalizeDate(date);
		const dateKey = this.getDateKey(dateObj);
		return this.jobsByDate().get(dateKey) || [];
	}

	getEventColor(date: Date | { day: number; month: number; year: number }): string | null {
		const jobs = this.getJobsForDate(date);
		if (jobs.length === 0) return null;
		const hash = this.hashString(jobs[0].id);
		return this.eventColors[hash % this.eventColors.length];
	}

	getJobColor(job: Job): string {
		const hash = this.hashString(job.id);
		return this.eventColors[hash % this.eventColors.length];
	}

	private hashString(str: string): number {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	}

	private normalizeDate(date: Date | { day: number; month: number; year: number }): Date {
		if (date instanceof Date) {
			return date;
		}
		return new Date(date.year, date.month, date.day);
	}

	private getDateKey(date: Date): string {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}
}
