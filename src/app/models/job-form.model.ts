import type { ProfileDto, CreateJobCommand } from '../types';

export interface JobFormModel {
	title: string;
	description: string;
	location: string;
	startDate: Date | null;
	endDate: Date | null;
	assignedUsers: ProfileDto[];
}

/**
 * Model for submitting job form data to the API.
 * Derives core fields from CreateJobCommand and adds assigned_user_ids for batch assignment.
 */
export type JobFormSubmitModel = Pick<
	CreateJobCommand,
	'title' | 'description' | 'location' | 'created_by' | 'start_date' | 'end_date'
> & {
	description: string;
	location: string;
	assigned_user_ids: string[];
};
