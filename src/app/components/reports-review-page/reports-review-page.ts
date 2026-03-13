import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Layout } from '../layout/layout';
import { JobReportService } from '../../services/job-report/job-report.service';
import type { JobReportWithJobAndUserDto } from '../../types/dto.types';

@Component({
  selector: 'app-reports-review-page',
  imports: [Layout, ProgressSpinnerModule, ButtonModule, DatePipe, TagModule],
  templateUrl: './reports-review-page.html',
  styleUrl: './reports-review-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsReviewPage implements OnInit {
  private reportService = inject(JobReportService);

  reports = this.reportService.allItems;
  loading = this.reportService.loading;
  selectedReport = signal<JobReportWithJobAndUserDto | null>(null);

  ngOnInit() {
    this.reportService.loadAllReports();
  }

  openReport(report: JobReportWithJobAndUserDto): void {
    this.selectedReport.set(report);
  }

  closeDetail(): void {
    this.selectedReport.set(null);
  }

  acceptReport(id: string): void {
    this.reportService.acceptReport(id);
    this.selectedReport.set(null);
  }

  revertReport(id: string): void {
    this.reportService.revertReport(id);
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
