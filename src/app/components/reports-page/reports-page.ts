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
    TextareaModule,
    TagModule,
    TooltipModule,
    PanelModule,
  ],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.css',
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

  // Event-level form fields
  kilometers = '';
  meals = '';
  overtime = '';
  notes = '';

  // Per-day entries (mutable array for template-driven forms)
  dayEntries: JobReportDayDto[] = [];

  ngOnInit() {
    const userId = this.userId();
    if (userId) {
      this.reportService.loadUserReports(userId);
    }
  }

  openReport(report: JobReportWithJobDto): void {
    this.selectedReport.set(report);
    this.kilometers = report.kilometers ?? '';
    this.meals = report.meals ?? '';
    this.overtime = report.overtime ?? '';
    this.notes = report.notes ?? '';

    // Sort day entries by date
    this.dayEntries = [...(report.JobReportDay ?? [])].sort(
      (a, b) => a.date.localeCompare(b.date)
    );
  }

  closeForm(): void {
    this.selectedReport.set(null);
    this.kilometers = '';
    this.meals = '';
    this.overtime = '';
    this.notes = '';
    this.dayEntries = [];
  }

  isReadOnly(): boolean {
    return this.selectedReport()?.status === 'ACCEPTED';
  }

  hasAllWageRates(): boolean {
    return this.dayEntries.length > 0 && this.dayEntries.every((d) => d.wage_rate.trim() !== '');
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
      this.dayEntries
    );
    this.selectedReport.set(null);
  }

  copyWageRateFromIndex(index: number): void {
    const rate = this.dayEntries[index]?.wage_rate ?? '';
    if (!rate.trim()) return;
    for (let i = 0; i < this.dayEntries.length; i++) {
      if (i !== index) {
        this.dayEntries[i].wage_rate = rate;
      }
    }
  }

  copyToolsFromIndex(index: number): void {
    const tools = this.dayEntries[index]?.tools ?? '';
    if (!tools.trim()) return;
    for (let i = 0; i < this.dayEntries.length; i++) {
      if (i !== index) {
        this.dayEntries[i].tools = tools;
      }
    }
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
