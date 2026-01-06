export interface JobFormModel {
	title: string;
	description: string;
	location: string;
	startDate: Date | null;
	endDate: Date | null;
}

export type JobFormSubmitModel = Omit<JobFormModel, 'startDate' | 'endDate'> & {
	created_by: string;
	start_date: string;
	end_date: string;
};