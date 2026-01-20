/**
 * DTO (Data Transfer Object) Types
 *
 * These types represent the read models returned from the API.
 * All DTOs are derived from the database entity Row types.
 */

import type { Tables } from '../supabase/database.types';

// =============================================================================
// Base Entity DTOs (direct mappings to database Row types)
// =============================================================================

/** User profile DTO */
export type ProfileDto = Tables<'Profile'>;

/** User availability period DTO */
export type AvailabilityDto = Tables<'Availability'>;

/** Job/event DTO */
export type JobDto = Tables<'Job'>;

/** Job assignment DTO */
export type JobAssignmentDto = Tables<'JobAssignment'>;

/** Job day (individual day within a job) DTO */
export type JobDayDto = Tables<'JobDay'>;

/** Job report (work log for a job day) DTO */
export type JobReportDto = Tables<'JobReport'>;

/** Notification DTO */
export type NotificationDto = Tables<'Notification'>;

// =============================================================================
// Composite DTOs (entities with related data)
// =============================================================================

/** Job assignment with the assigned user's profile */
export type JobAssignmentWithUserDto = JobAssignmentDto & {
  user: ProfileDto;
};

/** Job assignment with full context (user and assigner profiles) */
export type JobAssignmentWithDetailsDto = JobAssignmentDto & {
  user: ProfileDto;
  assigned_by_user: ProfileDto;
};

/** Job day with associated reports */
export type JobDayWithReportsDto = JobDayDto & {
  reports: JobReportDto[];
};

/** Job report with user profile */
export type JobReportWithUserDto = JobReportDto & {
  user: ProfileDto;
};

/** Job day with reports that include user profiles */
export type JobDayWithDetailedReportsDto = JobDayDto & {
  reports: JobReportWithUserDto[];
};

/** Job with its assignments (users assigned to the job) */
export type JobWithAssignmentsDto = JobDto & {
  assignments: JobAssignmentWithUserDto[];
};

/** Job with its days */
export type JobWithDaysDto = JobDto & {
  days: JobDayDto[];
};

/** Job with full details: creator, assignments with users, and days */
export type JobWithDetailsDto = JobDto & {
  created_by_user: ProfileDto;
  assignments: JobAssignmentWithUserDto[];
  days: JobDayDto[];
};

/** Job with complete details including reports for each day */
export type JobWithFullDetailsDto = JobDto & {
  created_by_user: ProfileDto;
  assignments: JobAssignmentWithUserDto[];
  days: JobDayWithDetailedReportsDto[];
};

/** Availability with user profile */
export type AvailabilityWithUserDto = AvailabilityDto & {
  user: ProfileDto;
};

/** Notification with user profile */
export type NotificationWithUserDto = NotificationDto & {
  user: ProfileDto;
};

// =============================================================================
// List/Summary DTOs (optimized for list views)
// =============================================================================

/** Minimal job info for list displays */
export type JobListItemDto = Pick<
  JobDto,
  'id' | 'title' | 'location' | 'start_date' | 'end_date'
>;

/** Job list item with assignment count */
export type JobListItemWithCountDto = JobListItemDto & {
  assignment_count: number;
};

/** Minimal profile info for dropdowns/selections */
export type ProfileSummaryDto = Pick<ProfileDto, 'id' | 'username' | 'role'>;

/** Notification summary for badges/counts */
export type NotificationSummaryDto = Pick<
  NotificationDto,
  'id' | 'title' | 'is_read' | 'created_at'
>;
