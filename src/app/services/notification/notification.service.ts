import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { supabase } from '../../supabase/supabase-client';
import { AuthService } from '../auth/auth.service';
import type { Tables } from '../../supabase/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType =
	| 'general'
	| 'job_assigned'
	| 'job_unassigned'
	| 'job_updated'
	| 'job_deleted';

export type Notification = Tables<'Notification'>;

@Injectable({
	providedIn: 'root',
})
export class NotificationService {
	private authService = inject(AuthService);
	private realtimeChannel: RealtimeChannel | null = null;

	items = signal<Notification[]>([]);
	loading = signal(false);
	error = signal<string | null>(null);

	unreadCount = computed(() => this.items().filter((n) => !n.is_read).length);

	constructor() {
		effect(() => {
			const user = this.authService.userData();
			if (user) {
				this.fetchNotifications();
				this.subscribeToRealtime(user.id);
			} else {
				this.cleanup();
			}
		});
	}

	async fetchNotifications(): Promise<void> {
		const userId = this.authService.userData()?.id;
		if (!userId) return;

		this.loading.set(true);
		this.error.set(null);

		const { data, error } = await supabase
			.from('Notification')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(50);

		if (error) {
			this.error.set(error.message);
			this.items.set([]);
		} else {
			this.items.set(data ?? []);
		}

		this.loading.set(false);
	}

	async markAsRead(id: string): Promise<void> {
		const { error } = await supabase
			.from('Notification')
			.update({ is_read: true })
			.eq('id', id);

		if (!error) {
			this.items.update((items) =>
				items.map((item) => (item.id === id ? { ...item, is_read: true } : item))
			);
		}
	}

	async markAllAsRead(): Promise<void> {
		const userId = this.authService.userData()?.id;
		if (!userId) return;

		const { error } = await supabase
			.from('Notification')
			.update({ is_read: true })
			.eq('user_id', userId)
			.eq('is_read', false);

		if (!error) {
			this.items.update((items) => items.map((item) => ({ ...item, is_read: true })));
		}
	}

	async deleteNotification(id: string): Promise<void> {
		const { error } = await supabase.from('Notification').delete().eq('id', id);

		if (!error) {
			this.items.update((items) => items.filter((item) => item.id !== id));
		}
	}

	private subscribeToRealtime(userId: string): void {
		this.unsubscribeFromRealtime();

		this.realtimeChannel = supabase
			.channel(`notifications:${userId}`)
			.on<Notification>(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'Notification',
					filter: `user_id=eq.${userId}`,
				},
				(payload) => {
					this.items.update((items) => [payload.new, ...items]);
				}
			)
			.on<Notification>(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'Notification',
					filter: `user_id=eq.${userId}`,
				},
				(payload) => {
					this.items.update((items) =>
						items.map((item) => (item.id === payload.new.id ? payload.new : item))
					);
				}
			)
			.on<Notification>(
				'postgres_changes',
				{
					event: 'DELETE',
					schema: 'public',
					table: 'Notification',
					filter: `user_id=eq.${userId}`,
				},
				(payload) => {
					this.items.update((items) => items.filter((item) => item.id !== payload.old.id));
				}
			)
			.subscribe();
	}

	private unsubscribeFromRealtime(): void {
		if (this.realtimeChannel) {
			supabase.removeChannel(this.realtimeChannel);
			this.realtimeChannel = null;
		}
	}

	private cleanup(): void {
		this.unsubscribeFromRealtime();
		this.items.set([]);
		this.error.set(null);
	}

	getNotificationIcon(type: string): string {
		switch (type) {
			case 'job_assigned':
				return 'pi pi-user-plus';
			case 'job_unassigned':
				return 'pi pi-user-minus';
			case 'job_updated':
				return 'pi pi-pencil';
			case 'job_deleted':
				return 'pi pi-trash';
			default:
				return 'pi pi-bell';
		}
	}

	getNotificationColor(type: string): string {
		switch (type) {
			case 'job_assigned':
				return 'text-green-500';
			case 'job_unassigned':
				return 'text-orange-500';
			case 'job_updated':
				return 'text-blue-500';
			case 'job_deleted':
				return 'text-red-500';
			default:
				return 'text-surface-500';
		}
	}
}
