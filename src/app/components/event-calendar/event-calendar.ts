import { Component, inject, signal, computed, effect, OnInit } from '@angular/core';
import { DatePicker } from 'primeng/datepicker';
import { Tooltip } from 'primeng/tooltip';
import { JobService } from '../../services/job/job.service';
import type { Tables } from '../../supabase/database.types';

type Job = Tables<'Job'>;

@Component({
  selector: 'app-event-calendar',
  imports: [DatePicker, Tooltip],
  templateUrl: './event-calendar.html',
  styleUrl: './event-calendar.css',
})
export class EventCalendar implements OnInit {
	private jobService = inject(JobService);

	private readonly currentDate = signal<Date>(new Date());
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
			
			// Iterate through all dates in the job's date range
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
		}
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

	getTooltip(date: Date | { day: number; month: number; year: number }): string {
		const jobs = this.getJobsForDate(date);
		if (jobs.length === 0) {
			return '';
		}

		return jobs
			.map((job) => {
				const startDate = new Date(job.start_date).toLocaleDateString('pl-PL');
				const endDate = new Date(job.end_date).toLocaleDateString('pl-PL');
				const dateRange =
					job.start_date === job.end_date
						? startDate
						: `${startDate} - ${endDate}`;
				return `${job.title}\n${job.location || 'Brak lokalizacji'}\n${dateRange}\n${job.description || ''}`;
			})
			.join('\n\n');
	}

	getEventColor(date: Date | { day: number; month: number; year: number }): string | null {
		const jobs = this.getJobsForDate(date);
		if (jobs.length === 0) return null;
		const hash = this.hashString(jobs[0].id);
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
