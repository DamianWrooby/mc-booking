import type { ProfileDto } from '../types';

export interface UserState {
	items: ProfileDto[];
	selectedItem: ProfileDto | null;
	loading: boolean;
	error: string | null;
}
