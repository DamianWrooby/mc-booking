import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { Popover, PopoverModule } from 'primeng/popover';
import { AuthService } from '../../services/auth/auth.service';
import { NotificationService } from '../../services/notification/notification.service';
import { NotificationPanel } from '../notification-panel/notification-panel';

@Component({
	selector: 'app-notification-bell',
	templateUrl: './notification-bell.html',
	styleUrl: './notification-bell.css',
	imports: [ButtonModule, BadgeModule, PopoverModule, NotificationPanel],
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell {
	private authService = inject(AuthService);
	private notificationService = inject(NotificationService);

	popover = viewChild.required<Popover>('popover');

	isAuthenticated = this.authService.isAuthenticated;
	unreadCount = this.notificationService.unreadCount;

	badgeValue = computed(() => {
		const count = this.unreadCount();
		if (count === 0) return null;
		return count > 99 ? '99+' : count.toString();
	});

	togglePopover(event: Event): void {
		this.popover().toggle(event);
	}

	closePopover(): void {
		this.popover().hide();
	}
}
