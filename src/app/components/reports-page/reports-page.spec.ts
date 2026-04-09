import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ReportsPage } from './reports-page';
import { JobReportService } from '../../services/job-report/job-report.service';
import { AuthService } from '../../services/auth/auth.service';
import type { JobReportWithJobDto, JobReportDayDto } from '../../types/dto.types';

const mockReportService = {
  items: signal([]),
  loading: signal(false),
  loadUserReports: jasmine.createSpy('loadUserReports'),
  submitReport: jasmine.createSpy('submitReport'),
};

const mockAuthService = {
  userData: signal({ id: 'user-1', username: 'test' }),
};

function makeDayEntry(overrides: Partial<JobReportDayDto> = {}): JobReportDayDto {
  return {
    id: 'day-1',
    report_id: 'report-1',
    date: '2026-04-01',
    wage_rate: '1x',
    tools: null,
    ...overrides,
  } as JobReportDayDto;
}

function makeReport(overrides: Partial<JobReportWithJobDto> = {}): JobReportWithJobDto {
  return {
    id: 'report-1',
    job_id: 'job-1',
    user_id: 'user-1',
    status: 'NEW',
    kilometers: null,
    meals: null,
    overtime: null,
    notes: null,
    created_at: '2026-04-01',
    submitted_at: null,
    accepted_at: null,
    Job: {
      id: 'job-1',
      title: 'Test Job',
      start_date: '2026-04-01',
      end_date: '2026-04-03',
      location: 'Warsaw',
    } as any,
    JobReportDay: [
      makeDayEntry({ id: 'day-2', date: '2026-04-02', tools: null }),
      makeDayEntry({ id: 'day-1', date: '2026-04-01', tools: 'Tak' }),
    ],
    ...overrides,
  } as JobReportWithJobDto;
}

describe('ReportsPage', () => {
  let component: ReportsPage;
  let fixture: ComponentFixture<ReportsPage>;

  beforeEach(async () => {
    mockReportService.loadUserReports.calls.reset();
    mockReportService.submitReport.calls.reset();

    await TestBed.configureTestingModule({
      imports: [ReportsPage],
      providers: [
        { provide: JobReportService, useValue: mockReportService },
        { provide: AuthService, useValue: mockAuthService },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('openReport - tools default value', () => {
    it('should default tools to "Nie" when tools is null', () => {
      const report = makeReport({
        JobReportDay: [makeDayEntry({ tools: null })],
      });

      component.openReport(report);

      expect(component.dayEntries()[0].tools).toBe('Nie');
    });

    it('should default tools to "Nie" when tools is empty string', () => {
      const report = makeReport({
        JobReportDay: [makeDayEntry({ tools: '' })],
      });

      component.openReport(report);

      expect(component.dayEntries()[0].tools).toBe('Nie');
    });

    it('should preserve existing "Tak" value', () => {
      const report = makeReport({
        JobReportDay: [makeDayEntry({ tools: 'Tak' })],
      });

      component.openReport(report);

      expect(component.dayEntries()[0].tools).toBe('Tak');
    });

    it('should preserve existing "Nie" value', () => {
      const report = makeReport({
        JobReportDay: [makeDayEntry({ tools: 'Nie' })],
      });

      component.openReport(report);

      expect(component.dayEntries()[0].tools).toBe('Nie');
    });

    it('should sort day entries by date', () => {
      const report = makeReport({
        JobReportDay: [
          makeDayEntry({ id: 'day-2', date: '2026-04-02' }),
          makeDayEntry({ id: 'day-1', date: '2026-04-01' }),
        ],
      });

      component.openReport(report);

      expect(component.dayEntries()[0].date).toBe('2026-04-01');
      expect(component.dayEntries()[1].date).toBe('2026-04-02');
    });
  });

  describe('updateTools', () => {
    it('should update tools value at given index', () => {
      const report = makeReport({
        JobReportDay: [
          makeDayEntry({ id: 'day-1', date: '2026-04-01', tools: 'Nie' }),
          makeDayEntry({ id: 'day-2', date: '2026-04-02', tools: 'Nie' }),
        ],
      });
      component.openReport(report);

      component.updateTools(0, 'Tak');

      expect(component.dayEntries()[0].tools).toBe('Tak');
      expect(component.dayEntries()[1].tools).toBe('Nie');
    });
  });

  describe('copyToolsFromIndex', () => {
    it('should copy tools value to all other entries', () => {
      const report = makeReport({
        JobReportDay: [
          makeDayEntry({ id: 'day-1', date: '2026-04-01', tools: 'Tak' }),
          makeDayEntry({ id: 'day-2', date: '2026-04-02', tools: 'Nie' }),
          makeDayEntry({ id: 'day-3', date: '2026-04-03', tools: 'Nie' }),
        ],
      });
      component.openReport(report);

      component.copyToolsFromIndex(0);

      expect(component.dayEntries()[1].tools).toBe('Tak');
      expect(component.dayEntries()[2].tools).toBe('Tak');
    });

    it('should not copy when tools is empty', () => {
      const report = makeReport({
        JobReportDay: [
          makeDayEntry({ id: 'day-1', date: '2026-04-01', tools: '' }),
          makeDayEntry({ id: 'day-2', date: '2026-04-02', tools: 'Tak' }),
        ],
      });
      component.openReport(report);
      // Override with empty to test guard
      component.updateTools(0, '');

      component.copyToolsFromIndex(0);

      // Should not overwrite since source is empty
      expect(component.dayEntries()[1].tools).toBe('Tak');
    });
  });
});
