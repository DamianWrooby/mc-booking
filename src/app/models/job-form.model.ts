import type { UserProfile } from './user.model';

export interface JobFormModel {
	title: string;
	description: string;
	location: string;
	startDate: Date | null;
	endDate: Date | null;
	assignedUsers: UserProfile[];
}

export type JobFormSubmitModel = Omit<JobFormModel, 'startDate' | 'endDate' | 'assignedUsers'> & {
	created_by: string;
	start_date: string;
	end_date: string;
	assigned_user_ids: string[];
};