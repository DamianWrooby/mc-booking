import { computed, inject, effect, Injectable, signal } from '@angular/core';
import { from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ErrorService } from '../error/error.service';
import { HttpService } from '../../models/http-service.model';
import { supabase } from '../../supabase/supabase-client';
import type { Tables, TablesInsert, TablesUpdate } from '../../supabase/database.types';

type Job = Tables<'Job'>;

interface JobState {
	items: Job[];
	selectedItem: Job | null;
	loading: boolean;
	error: string | null;
}

const initialState: JobState = {
	items: [],
	selectedItem: null,
	loading: false,
	error: null,
};

@Injectable({
	providedIn: 'root',
})
export class JobService implements HttpService<Job> {
	private errorService = inject(ErrorService);

	private readonly state = signal<JobState>(initialState);

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

		from(supabase.from('Job').select('*'))
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data ?? [];
				}),
				catchError((_) => {
					this.setError('Failed to load entities');
					return of([]);
				})
			)
			.subscribe((jobs) => {
				this.state.update((state) => ({
					...state,
					items: jobs,
					loading: false,
				}));
			});
	}

	getByUserId(userId: string): void {
		this.setLoading(true);
		this.resetError();

		from(
			supabase
				.from('JobAssignment')
				.select('job_id, status, Job(*)')
				.eq('user_id', userId)
		)
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return (data ?? []).map((assignment) => assignment.Job as Job).filter(Boolean);
				}),
				catchError((_) => {
					this.setError('Failed to load user jobs');
					return of([]);
				})
			)
			.subscribe((jobs) => {
				this.state.update((state) => ({
					...state,
					items: jobs,
					loading: false,
				}));
			});
	}

	getById(id: string): void {
		this.setLoading(true);
		this.resetError();

		from(supabase.from('Job').select('*').eq('id', id).single())
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
			.subscribe((job) => {
				this.state.update((state) => ({
					...state,
					selectedItem: job,
					loading: false,
				}));
			});
	}

	create(
		job: Omit<Job, 'id' | 'created_at' | 'created_by'>,
		onSuccess?: (createdJob: Job) => void
	): void {
		this.setLoading(true);
		this.resetError();

		from(
			supabase
				.from('Job')
				.insert(job as TablesInsert<'Job'>)
				.select()
				.single()
		)
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data;
				}),
				catchError((_) => {
					this.setError('Failed to create entity');
					return of(null);
				})
			)
			.subscribe((newJob) => {
				if (!newJob) return;

				this.state.update((state) => ({
					...state,
					items: [...state.items, newJob],
					selectedItem: newJob,
					loading: false,
				}));

				onSuccess?.(newJob);
			});
	}

	update(id: string, changes: Partial<Job>): void {
		this.setLoading(true);
		this.resetError();

		from(
			supabase
				.from('Job')
				.update(changes as TablesUpdate<'Job'>)
				.eq('id', id)
				.select()
				.single()
		)
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data;
				}),
				catchError((_) => {
					this.setError('Failed to update entity');
					return of(null);
				})
			)
			.subscribe((updatedJob) => {
				if (!updatedJob) return;

				this.state.update((state) => ({
					...state,
					items: state.items.map((j) => (j.id === id ? updatedJob : j)),
					selectedJob: updatedJob,
					loading: false,
				}));
			});
	}

	delete(id: string): void {
		this.setLoading(true);
		this.resetError();

		from(supabase.from('Job').delete().eq('id', id))
			.pipe(
				map(({ data, error }) => {
					if (error) throw error;
					return data;
				}),
				catchError((_) => {
					this.setError('Failed to delete entity');
					return of(null);
				})
			)
			.subscribe(() => {
				this.state.update((state) => ({
					...state,
					items: state.items.filter((j) => j.id !== id),
					selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
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
