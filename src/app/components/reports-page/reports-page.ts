import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { Layout } from '../layout/layout';
import { JobReportService } from '../../services/job-report/job-report.service';
import { AuthService } from '../../services/auth/auth.service';
import type { JobReportWithJobDto } from '../../types/dto.types';

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
  ],
  templateUrl: './reports-page.html',
  styleUrl: './reports-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage implements OnInit {
  private reportService = inject(JobReportService);
  private authService = inject(AuthService);

  reports = this.reportService.items;
  loading = this.reportService.loading;
  selectedReport = signal<JobReportWithJobDto | null>(null);

  private userId = computed(() => this.authService.userData()?.id);

  // Form fields (plain class properties for template-driven forms)
  wageRate = '';
  kilometers = '';
  tools = '';
  meals = '';
  overtime = '';
  notes = '';

  ngOnInit() {
    const userId = this.userId();
    if (userId) {
      this.reportService.loadUserReports(userId);
    }
  }

  openReport(report: JobReportWithJobDto): void {
    this.selectedReport.set(report);
    this.wageRate = report.wage_rate ?? '';
    this.kilometers = report.kilometers ?? '';
    this.tools = report.tools ?? '';
    this.meals = report.meals ?? '';
    this.overtime = report.overtime ?? '';
    this.notes = report.notes ?? '';
  }

  closeForm(): void {
    this.selectedReport.set(null);
  }

  isReadOnly(): boolean {
    return this.selectedReport()?.status === 'ACCEPTED';
  }

  saveReport(): void {
    const report = this.selectedReport();
    if (!report || !this.wageRate.trim()) return;

    this.reportService.submitReport(report.id, {
      wage_rate: this.wageRate,
      kilometers: this.kilometers || null,
      tools: this.tools || null,
      meals: this.meals || null,
      overtime: this.overtime || null,
      notes: this.notes || null,
    });
    this.selectedReport.set(null);
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
