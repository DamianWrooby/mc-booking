import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ReportsReviewPage } from './reports-review-page';
import { JobReportService } from '../../services/job-report/job-report.service';
import type { JobReportWithJobAndUserDto } from '../../types/dto.types';

const mockReportService = {
  allItems: signal([]),
  loading: signal(false),
  loadAllReports: jasmine.createSpy('loadAllReports'),
  acceptReport: jasmine.createSpy('acceptReport'),
  revertReport: jasmine.createSpy('revertReport'),
};

function makeReviewReport(overrides: Partial<JobReportWithJobAndUserDto> = {}): JobReportWithJobAndUserDto {
  return {
    id: 'report-1',
    job_id: 'job-1',
    user_id: 'user-1',
    status: 'SUBMITTED',
    kilometers: null,
    meals: null,
    overtime: null,
    notes: null,
    created_at: '2026-04-01',
    submitted_at: '2026-04-02',
    accepted_at: null,
    Job: {
      id: 'job-1',
      title: 'Test Job',
      start_date: '2026-04-01',
      end_date: '2026-04-03',
      location: 'Warsaw',
    } as any,
    Profile: {
      id: 'user-1',
      username: 'testuser',
    } as any,
    JobReportDay: [
      { id: 'day-2', report_id: 'report-1', date: '2026-04-02', wage_rate: '1x', tools: 'Tak' },
      { id: 'day-1', report_id: 'report-1', date: '2026-04-01', wage_rate: '1.5x', tools: 'Nie' },
    ],
    ...overrides,
  } as JobReportWithJobAndUserDto;
}

describe('ReportsReviewPage', () => {
  let component: ReportsReviewPage;
  let fixture: ComponentFixture<ReportsReviewPage>;

  beforeEach(async () => {
    mockReportService.loadAllReports.calls.reset();
    mockReportService.acceptReport.calls.reset();
    mockReportService.revertReport.calls.reset();

    await TestBed.configureTestingModule({
      imports: [ReportsReviewPage],
      providers: [
        { provide: JobReportService, useValue: mockReportService },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsReviewPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('openReport', () => {
    it('should sort day entries by date', () => {
      const report = makeReviewReport();

      component.openReport(report);

      expect(component.sortedDays()[0].date).toBe('2026-04-01');
      expect(component.sortedDays()[1].date).toBe('2026-04-02');
    });

    it('should preserve tools values (Tak/Nie) in sorted entries', () => {
      const report = makeReviewReport();

      component.openReport(report);

      expect(component.sortedDays()[0].tools).toBe('Nie');
      expect(component.sortedDays()[1].tools).toBe('Tak');
    });
  });

  describe('template - Wysokość label', () => {
    it('should display "Wysokość" column header instead of "Narzędzia"', () => {
      const report = makeReviewReport();
      component.openReport(report);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const headers = el.querySelectorAll('span');
      const headerTexts = Array.from(headers).map((h) => h.textContent?.trim());

      expect(headerTexts).toContain('Wysokość');
      expect(headerTexts).not.toContain('Narzędzia');
    });
  });
});
