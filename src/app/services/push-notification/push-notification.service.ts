import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { Router } from '@angular/router';
import { supabase } from '../../supabase/supabase-client';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
	providedIn: 'root',
})
export class PushNotificationService {
	private swPush = inject(SwPush);
	private authService = inject(AuthService);
	private router = inject(Router);

	isSupported = signal(false);
	isSubscribed = signal(false);
	permissionState = signal<NotificationPermission>('default');
	loading = signal(false);

	canSubscribe = computed(
		() =>
			this.isSupported() &&
			this.permissionState() !== 'denied' &&
			!this.isSubscribed() &&
			!this.loading()
	);

	constructor() {
		this.checkSupport();
		this.setupNotificationClickHandler();

		effect(() => {
			const user = this.authService.userData();
			if (user) {
				this.checkExistingSubscription();
			} else {
				this.isSubscribed.set(false);
			}
		});
	}

	private checkSupport(): void {
		const supported =
			this.swPush.isEnabled && 'Notification' in window && 'PushManager' in window;
		this.isSupported.set(supported);

		if (supported) {
			this.permissionState.set(Notification.permission);
		}
	}

	private async checkExistingSubscription(): Promise<void> {
		if (!this.isSupported()) return;

		try {
			const subscription = await this.swPush.subscription.toPromise();
			this.isSubscribed.set(!!subscription);
		} catch {
			this.isSubscribed.set(false);
		}
	}

	async requestPermission(): Promise<NotificationPermission> {
		if (!this.isSupported()) {
			return 'denied';
		}

		const permission = await Notification.requestPermission();
		this.permissionState.set(permission);
		return permission;
	}

	async subscribe(): Promise<boolean> {
		const userId = this.authService.userData()?.id;
		if (!userId || !this.isSupported() || !environment.vapidPublicKey) {
			return false;
		}

		this.loading.set(true);

		try {
			const permission = await this.requestPermission();
			if (permission !== 'granted') {
				this.loading.set(false);
				return false;
			}

			const subscription = await this.swPush.requestSubscription({
				serverPublicKey: environment.vapidPublicKey,
			});

			const subscriptionJson = subscription.toJSON();

			const { error } = await supabase.from('PushSubscription').upsert(
				{
					user_id: userId,
					endpoint: subscriptionJson.endpoint!,
					p256dh: subscriptionJson.keys!['p256dh'],
					auth: subscriptionJson.keys!['auth'],
				},
				{
					onConflict: 'user_id,endpoint',
				}
			);

			if (error) {
				console.error('Failed to save push subscription:', error);
				this.loading.set(false);
				return false;
			}

			this.isSubscribed.set(true);
			this.loading.set(false);
			return true;
		} catch (error) {
			console.error('Failed to subscribe to push notifications:', error);
			this.loading.set(false);
			return false;
		}
	}

	async unsubscribe(): Promise<boolean> {
		const userId = this.authService.userData()?.id;
		if (!userId) {
			return false;
		}

		this.loading.set(true);

		try {
			const subscription = await this.swPush.subscription.toPromise();

			if (subscription) {
				await subscription.unsubscribe();

				const { error } = await supabase
					.from('PushSubscription')
					.delete()
					.eq('user_id', userId)
					.eq('endpoint', subscription.endpoint);

				if (error) {
					console.error('Failed to remove push subscription from database:', error);
				}
			}

			this.isSubscribed.set(false);
			this.loading.set(false);
			return true;
		} catch (error) {
			console.error('Failed to unsubscribe from push notifications:', error);
			this.loading.set(false);
			return false;
		}
	}

	private setupNotificationClickHandler(): void {
		this.swPush.notificationClicks.subscribe((event) => {
			const data = event.notification.data;

			if (data?.jobId) {
				this.router.navigate(['/job', data.jobId]);
			} else if (data?.url) {
				this.router.navigateByUrl(data.url);
			}
		});
	}
}
