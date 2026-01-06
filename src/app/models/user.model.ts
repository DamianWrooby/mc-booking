import type { Tables } from '../supabase/database.types';

export type UserProfile = Tables<'Profile'>;

export interface UserState {
	items: UserProfile[];
	selectedItem: UserProfile | null;
	loading: boolean;
	error: string | null;
}
