import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { Layout } from '../layout/layout';
import { AuthService } from '../../services/auth/auth.service';

@Component({
	selector: 'app-my-account-page',
	imports: [Layout, FormsModule, InputTextModule, ButtonModule, MessageModule],
	templateUrl: './my-account-page.html',
	styleUrl: './my-account-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyAccountPage implements OnInit {
	private authService = inject(AuthService);
	private messageService = inject(MessageService);

	userProfile = this.authService.userProfile;
	userData = this.authService.userData;

	username = signal('');
	loading = signal(false);

	email = computed(() => this.userData()?.email ?? '');
	role = computed(() => this.userProfile()?.role ?? '');

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
}
