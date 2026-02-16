import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { Layout } from '../layout/layout';
import { AuthService } from '../../services/auth/auth.service';
import { PushNotificationService } from '../../services/push-notification/push-notification.service';

@Component({
	selector: 'app-my-account-page',
	imports: [Layout, FormsModule, InputTextModule, ButtonModule, MessageModule, ToggleSwitchModule],
	templateUrl: './my-account-page.html',
	styleUrl: './my-account-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyAccountPage implements OnInit {
	private authService = inject(AuthService);
	private messageService = inject(MessageService);
	pushService = inject(PushNotificationService);

	userProfile = this.authService.userProfile;
	userData = this.authService.userData;

	username = signal('');
	loading = signal(false);

	email = computed(() => this.userData()?.email ?? '');
	role = computed(() => this.userProfile()?.role ?? '');

	pushPermissionText = computed(() => {
		switch (this.pushService.permissionState()) {
			case 'granted':
				return 'Uprawnienia przyznane';
			case 'denied':
				return 'Uprawnienia zablokowane';
			default:
				return 'Uprawnienia nieprzyznane';
		}
	});

	isValid = computed(() => this.username().trim().length >= 3);
	hasChanges = computed(() => this.username().trim() !== (this.userProfile()?.username ?? ''));
	canSubmit = computed(() => this.isValid() && this.hasChanges() && !this.loading());

	ngOnInit(): void {
		this.username.set(this.userProfile()?.username ?? '');
	}

	async submit(): Promise<void> {
		if (!this.canSubmit()) return;

		this.loading.set(true);

		const result = await this.authService.updateProfile({ username: this.username().trim() });

		if (result.success) {
			this.messageService.add({
				severity: 'success',
				summary: 'Sukces',
				detail: 'Nazwa użytkownika została zaktualizowana',
			});
		} else {
			this.messageService.add({
				severity: 'error',
				summary: 'Błąd',
				detail: result.error ?? 'Nie udało się zaktualizować profilu',
			});
		}

		this.loading.set(false);
	}

	async togglePushNotifications(): Promise<void> {
		if (this.pushService.isSubscribed()) {
			const success = await this.pushService.unsubscribe();
			if (success) {
				this.messageService.add({
					severity: 'success',
					summary: 'Sukces',
					detail: 'Powiadomienia push zostały wyłączone',
				});
			} else {
				this.messageService.add({
					severity: 'error',
					summary: 'Błąd',
					detail: 'Nie udało się wyłączyć powiadomień push',
				});
			}
		} else {
			const success = await this.pushService.subscribe();
			if (success) {
				this.messageService.add({
					severity: 'success',
					summary: 'Sukces',
					detail: 'Powiadomienia push zostały włączone',
				});
			} else {
				this.messageService.add({
					severity: 'error',
					summary: 'Błąd',
					detail:
						this.pushService.permissionState() === 'denied'
							? 'Uprawnienia do powiadomień są zablokowane. Zmień ustawienia przeglądarki.'
							: 'Nie udało się włączyć powiadomień push',
				});
			}
		}
	}
}
