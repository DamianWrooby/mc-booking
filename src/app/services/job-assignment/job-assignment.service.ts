import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { from, of, switchMap } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ErrorService } from '../error/error.service';
import { supabase } from '../../supabase/supabase-client';
import type { TablesInsert } from '../../supabase/database.types';
import type { JobAssignmentDto, JobAssignmentWithUserDto, ProfileDto } from '../../types';

interface JobAssignmentState {
	items: JobAssignmentDto[];
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

	getByJobIdWithUsers(jobId: string, onSuccess?: (assignments: JobAssignmentWithUserDto[]) => void): void {
		this.setLoading(true);
		this.resetError();

		from(
			supabase
				.from('JobAssignment')
				.select('*, user:Profile!user_id(*)')
				.eq('job_id', jobId)
		)
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return (data ?? []).map((item) => ({
						...item,
						user: item.user as ProfileDto,
					})) as JobAssignmentWithUserDto[];
				}),
				catchError((_) => {
					this.setError('Failed to load assignments');
					return of([] as JobAssignmentWithUserDto[]);
				})
			)
			.subscribe((assignments) => {
				this.setLoading(false);
				onSuccess?.(assignments);
			});
	}

	deleteByJobId(jobId: string): void {
		this.setLoading(true);
		this.resetError();

		from(supabase.from('JobAssignment').delete().eq('job_id', jobId))
			.pipe(
				map(({ error }) => {
					if (error) throw error;
				}),
				catchError((_) => {
					this.setError('Failed to delete assignments');
					return of(undefined);
				})
			)
			.subscribe(() => {
				this.state.update((state) => ({
					...state,
					items: state.items.filter((a) => a.job_id !== jobId),
					loading: false,
				}));
			});
	}

	replaceAssignments(jobId: string, userIds: string[], assignedBy: string, onSuccess?: () => void): void {
		if (userIds.length === 0) {
			this.deleteByJobId(jobId);
			onSuccess?.();
			return;
		}

		this.setLoading(true);
		this.resetError();

		from(supabase.from('JobAssignment').delete().eq('job_id', jobId))
			.pipe(
				switchMap(({ error }) => {
					if (error) throw error;
					const assignments: TablesInsert<'JobAssignment'>[] = userIds.map((userId) => ({
						job_id: jobId,
						user_id: userId,
						assigned_by: assignedBy,
						status: 'pending',
					}));
					return from(supabase.from('JobAssignment').insert(assignments).select());
				}),
				map(({ data, error }) => {
					if (error) throw error;
					return data ?? [];
				}),
				catchError((_) => {
					this.setError('Failed to update assignments');
					return of([]);
				})
			)
			.subscribe((newAssignments) => {
				this.state.update((state) => ({
					...state,
					items: [...state.items.filter((a) => a.job_id !== jobId), ...newAssignments],
					loading: false,
				}));
				onSuccess?.();
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
