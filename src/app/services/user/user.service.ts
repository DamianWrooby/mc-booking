import { computed, inject, effect, Injectable, signal } from '@angular/core';

import { ErrorService } from '../error/error.service';
import { HttpService } from '../../models/http-service.model';
import { supabase } from '../../supabase/supabase-client';
import { catchError, from, map, of } from 'rxjs';
import { UserProfile, UserState } from '../../models/user.model';

const initialState: UserState = {
	items: [],
	selectedItem: null,
	loading: false,
	error: null,
};

@Injectable({
	providedIn: 'root',
})
export class UserService implements HttpService<UserProfile> {
	private errorService = inject(ErrorService);

	private readonly state = signal<UserState>(initialState);


	readonly items = computed(() => this.state().items);
	readonly selectedItem = computed(() => this.state().selectedItem);
	readonly loading = computed(() => this.state().loading);
	readonly error = computed(() => this.state().error);

	constructor() {
		effect(() => {
			const error = this.error();

			if (error) {
				this.errorService.showError(error);
			}
		});
	}

	getAll(): void {
		this.setLoading(true);
		this.resetError();

		from(supabase.from('Profile').select('*'))
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data ?? [];
				}),
				catchError((_) => {
					this.setError('Failed to load users');
					return of([]);
				})
			)
			.subscribe((users) => {
				this.state.update((state) => ({
					...state,
					items: users,
					loading: false,
				}));
			});
	}

	getById(id: string): void {
		this.setLoading(true);
		this.resetError();

		from(supabase.from('Profile').select('*').eq('id', id).single())
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data;
				}),
				catchError((err) => {
					this.setError(err.message ?? 'Failed to load entity');
					return of(null);
				})
			)
			.subscribe((userProfile) => {
				this.state.update((state) => ({
					...state,
					selectedItem: userProfile,
					loading: false,
				}));
			});
	}

	private setLoading(loading: boolean) {
		this.state.update((state) => ({ ...state, loading }));
	}

	private setError(error: string | null) {
		this.state.update((state) => ({ ...state, error }));
	}

	private resetError() {
		this.setError(null);
	}
}
