import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ErrorService } from '../error/error.service';
import { AuthService } from '../auth/auth.service';
import { supabase } from '../../supabase/supabase-client';
import type { Tables } from '../../supabase/database.types';
import type { CreateAvailabilityCommand } from '../../types/command.types';

type Availability = Tables<'Availability'>;

interface AvailabilityState {
	items: Availability[];
	loading: boolean;
	error: string | null;
}

const initialState: AvailabilityState = {
	items: [],
	loading: false,
	error: null,
};

@Injectable({
	providedIn: 'root',
})
export class AvailabilityService {
	private errorService = inject(ErrorService);
	private auth = inject(AuthService);

	private readonly state = signal<AvailabilityState>(initialState);

	readonly items = computed(() => this.state().items);
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

	getByUserId(userId: string): void {
		this.setLoading(true);
		this.resetError();

		from(
			supabase
				.from('Availability')
				.select('*')
				.eq('user_id', userId)
				.order('date_from', { ascending: true })
		)
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data ?? [];
				}),
				catchError(() => {
					this.setError('Nie udało się załadować dostępności');
					return of([]);
				})
			)
			.subscribe((items) => {
				this.state.update((state) => ({ ...state, items, loading: false }));
			});
	}

	create(command: CreateAvailabilityCommand): void {
		this.setLoading(true);
		this.resetError();

		const userId = this.auth.userProfile()?.id ?? '';

		from(
			supabase
				.from('Availability')
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.insert({ ...(command as any), user_id: userId, created_at: new Date().toISOString() })
				.select()
				.single()
		)
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data;
				}),
				catchError(() => {
					this.setError('Nie udało się dodać dostępności');
					return of(null);
				})
			)
			.subscribe((newItem) => {
				if (!newItem) return;
				this.state.update((state) => ({
					...state,
					items: [...state.items, newItem].sort((a, b) =>
						a.date_from.localeCompare(b.date_from)
					),
					loading: false,
				}));
			});
	}

	delete(id: string): void {
		this.setLoading(true);
		this.resetError();

		from(supabase.from('Availability').delete().eq('id', id))
			.pipe(
				map(({ error }) => {
					if (error) throw error;
				}),
				catchError(() => {
					this.setError('Nie udało się usunąć dostępności');
					return of(null);
				})
			)
			.subscribe(() => {
				this.state.update((state) => ({
					...state,
					items: state.items.filter((i) => i.id !== id),
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
