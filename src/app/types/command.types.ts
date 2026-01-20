/**
 * Command Model Types
 *
 * These types represent the write models used for creating and updating entities.
 * All commands are derived from the database TablesInsert and TablesUpdate types.
 */

import type { TablesInsert, TablesUpdate } from '../supabase/database.types';

// =============================================================================
// Profile Commands
// =============================================================================

/**
 * Command to create a new profile.
 * id is optional (can be provided for auth-linked profiles)
 * role defaults on the server
 */
export type CreateProfileCommand = TablesInsert<'Profile'>;

/** Command to update an existing profile */
export type UpdateProfileCommand = TablesUpdate<'Profile'>;

// =============================================================================
// Availability Commands
// =============================================================================

/**
 * Command to create a new availability period.
 * Omits server-generated fields (id, created_at, user_id set from auth)
 */
export type CreateAvailabilityCommand = Omit<
  TablesInsert<'Availability'>,
  'id' | 'created_at' | 'user_id'
>;

/** Command to update an existing availability period */
export type UpdateAvailabilityCommand = Omit<
  TablesUpdate<'Availability'>,
  'id' | 'created_at' | 'user_id'
>;

// =============================================================================
// Job Commands
// =============================================================================

/**
 * Command to create a new job.
 * Omits server-generated fields (id, created_at)
 */
export type CreateJobCommand = Omit<TablesInsert<'Job'>, 'id' | 'created_at'>;

/** Command to update an existing job */
export type UpdateJobCommand = Omit<
  TablesUpdate<'Job'>,
  'id' | 'created_at' | 'created_by'
>;

/**
 * Command to create a job with its days and initial assignments.
 * Used for atomic job creation with all related data.
 */
export type CreateJobWithDetailsCommand = CreateJobCommand & {
  /** Days to create for this job */
  days: Omit<CreateJobDayCommand, 'job_id'>[];
  /** User IDs to assign to this job */
  assigned_user_ids: string[];
};

// =============================================================================
// Job Assignment Commands
// =============================================================================

/**
 * Command to create a new job assignment.
 * Omits server-generated fields (id, assigned_at)
 */
export type CreateJobAssignmentCommand = Omit<
  TablesInsert<'JobAssignment'>,
  'id' | 'assigned_at'
>;

/** Command to update an existing job assignment (typically status changes) */
export type UpdateJobAssignmentCommand = Omit<
  TablesUpdate<'JobAssignment'>,
  'id' | 'assigned_at' | 'assigned_by' | 'job_id' | 'user_id'
>;

/**
 * Batch command to assign multiple users to a job.
 * Simplifies bulk assignment operations.
 */
export type BatchAssignUsersCommand = {
  job_id: string;
  user_ids: string[];
  assigned_by: string;
  status: string;
};

// =============================================================================
// Job Day Commands
// =============================================================================

/**
 * Command to create a new job day.
 * Omits server-generated id field.
 */
export type CreateJobDayCommand = Omit<TablesInsert<'JobDay'>, 'id'>;

/** Command to update an existing job day */
export type UpdateJobDayCommand = Omit<TablesUpdate<'JobDay'>, 'id' | 'job_id'>;

// =============================================================================
// Job Report Commands
// =============================================================================

/**
 * Command to create a new job report.
 * Omits server-generated fields (id, created_at)
 */
export type CreateJobReportCommand = Omit<
  TablesInsert<'JobReport'>,
  'id' | 'created_at'
>;

/** Command to update an existing job report */
export type UpdateJobReportCommand = Omit<
  TablesUpdate<'JobReport'>,
  'id' | 'created_at' | 'user_id' | 'job_day_id'
>;

// =============================================================================
// Notification Commands
// =============================================================================

/**
 * Command to create a new notification.
 * Omits server-generated fields (id, created_at)
 */
export type CreateNotificationCommand = Omit<
  TablesInsert<'Notification'>,
  'id' | 'created_at'
>;

/** Command to update an existing notification (typically marking as read) */
export type UpdateNotificationCommand = Omit<
  TablesUpdate<'Notification'>,
  'id' | 'created_at' | 'user_id'
>;

/** Command to mark multiple notifications as read */
export type MarkNotificationsReadCommand = {
  notification_ids: string[];
};
