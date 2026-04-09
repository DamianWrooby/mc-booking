import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PanelModule } from 'primeng/panel';
import { Layout } from '../layout/layout';
import { JobReportService } from '../../services/job-report/job-report.service';
import { AuthService } from '../../services/auth/auth.service';
import type { JobReportWithJobDto, JobReportDayDto } from '../../types/dto.types';

@Component({
  selector: 'app-reports-page',
  imports: [
    Layout,
    ProgressSpinnerModule,
    ButtonModule,
    DatePipe,
    FormsModule,
    InputTextModule,
    RadioButtonModule,
    TextareaModule,
    TagModule,
    TooltipModule,
    PanelModule,
  ],
  templateUrl: './reports-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ReportsPage implements OnInit {
	private reportService = inject(JobReportService);
	private authService = inject(AuthService);

	reports = this.reportService.items;
	loading = this.reportService.loading;
	selectedReport = signal<JobReportWithJobDto | null>(null);

	private userId = computed(() => this.authService.userData()?.id);

	kilometers = '';
	meals = '';
	overtime = '';
	notes = '';

	dayEntries = signal<JobReportDayDto[]>([]);

	ngOnInit() {
		const userId = this.userId();
		if (userId) {
			this.reportService.loadUserReports(userId);
		}
	}

	openReport(report: JobReportWithJobDto): void {
    console.log({report})
		this.selectedReport.set(report);
		this.kilometers = report.kilometers ?? '';
		this.meals = report.meals ?? '';
		this.overtime = report.overtime ?? '';
		this.notes = report.notes ?? '';

		this.dayEntries.set(
			[...(report.JobReportDay ?? [])]
				.sort((a, b) => a.date.localeCompare(b.date))
				.map((d) => ({ ...d, tools: d.tools || 'Nie' }))
		);
	}

	closeForm(): void {
		this.selectedReport.set(null);
		this.kilometers = '';
		this.meals = '';
		this.overtime = '';
		this.notes = '';
		this.dayEntries.set([]);
	}

	isReadOnly(): boolean {
		return this.selectedReport()?.status === 'ACCEPTED';
	}

	hasAllWageRates(): boolean {
		const entries = this.dayEntries();
		return entries.length > 0 && entries.every((d) => d.wage_rate.trim() !== '');
	}

	saveReport(): void {
		const report = this.selectedReport();
		if (!report || !this.hasAllWageRates()) return;

		this.reportService.submitReport(
			report.id,
			{
				kilometers: this.kilometers || null,
				meals: this.meals || null,
				overtime: this.overtime || null,
				notes: this.notes || null,
			},
			this.dayEntries()
		);
		this.selectedReport.set(null);
	}

	updateWageRate(index: number, value: string): void {
		this.dayEntries.update((entries) => entries.map((e, i) => (i === index ? { ...e, wage_rate: value } : e)));
	}

	updateTools(index: number, value: string): void {
		this.dayEntries.update((entries) => entries.map((e, i) => (i === index ? { ...e, tools: value } : e)));
	}

	copyWageRateFromIndex(index: number): void {
		const rate = this.dayEntries()[index]?.wage_rate ?? '';
		if (!rate.trim()) return;
		this.dayEntries.update((entries) => entries.map((e, i) => (i !== index ? { ...e, wage_rate: rate } : e)));
	}

	copyToolsFromIndex(index: number): void {
		const tools = this.dayEntries()[index]?.tools ?? '';
		if (!tools.trim()) return;
		this.dayEntries.update((entries) => entries.map((e, i) => (i !== index ? { ...e, tools: tools } : e)));
	}

	getStatusSeverity(status: string): 'warn' | 'info' | 'success' | 'secondary' {
		switch (status) {
			case 'NEW':
				return 'warn';
			case 'SUBMITTED':
				return 'info';
			case 'ACCEPTED':
				return 'success';
			default:
				return 'secondary';
		}
	}

	getStatusLabel(status: string): string {
		switch (status) {
			case 'NEW':
				return 'Nowy';
			case 'SUBMITTED':
				return 'Wysłany';
			case 'ACCEPTED':
				return 'Zaakceptowany';
			default:
				return status;
		}
	}
}
