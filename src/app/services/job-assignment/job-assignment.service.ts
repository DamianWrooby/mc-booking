import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ErrorService } from '../error/error.service';
import { supabase } from '../../supabase/supabase-client';
import type { Tables, TablesInsert } from '../../supabase/database.types';

type JobAssignment = Tables<'JobAssignment'>;

interface JobAssignmentState {
	items: JobAssignment[];
	loading: boolean;
	error: string | null;
}

const initialState: JobAssignmentState = {
	items: [],
	loading: false,
	error: null,
};

@Injectable({
	providedIn: 'root',
})
export class JobAssignmentService {
	private errorService = inject(ErrorService);

	private readonly state = signal<JobAssignmentState>(initialState);

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

	createBulk(jobId: string, userIds: string[], assignedBy: string): void {
		if (userIds.length === 0) {
			return;
		}

		this.setLoading(true);
		this.resetError();

		const assignments: TablesInsert<'JobAssignment'>[] = userIds.map((userId) => ({
			job_id: jobId,
			user_id: userId,
			assigned_by: assignedBy,
			status: 'pending',
		}));

		from(supabase.from('JobAssignment').insert(assignments).select())
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data ?? [];
				}),
				catchError((_) => {
					this.setError('Failed to create assignments');
					return of([]);
				})
			)
			.subscribe((newAssignments) => {
				this.state.update((state) => ({
					...state,
					items: [...state.items, ...newAssignments],
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
