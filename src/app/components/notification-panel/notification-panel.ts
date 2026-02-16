import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { NotificationService, Notification } from '../../services/notification/notification.service';

@Component({
	selector: 'app-notification-panel',
	templateUrl: './notification-panel.html',
	styleUrl: './notification-panel.css',
	imports: [ButtonModule, DatePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationPanel {
	private router = inject(Router);
	notificationService = inject(NotificationService);

	closePanel = output<void>();

	items = this.notificationService.items;
	loading = this.notificationService.loading;
	unreadCount = this.notificationService.unreadCount;

	getIcon(type: string | null): string {
		if (!type) {
			return '';
		}
		return this.notificationService.getNotificationIcon(type);
	}

	getIconColor(type: string | null): string {
		if (!type) {
			return '';
		}
		return this.notificationService.getNotificationColor(type);
	}

	async onNotificationClick(notification: Notification): Promise<void> {
		await this.notificationService.markAsRead(notification.id);

		if (notification.job_id) {
			this.closePanel.emit();
			this.router.navigate(['/job', notification.job_id]);
		}
	}

	async markAllAsRead(): Promise<void> {
		await this.notificationService.markAllAsRead();
	}
}
