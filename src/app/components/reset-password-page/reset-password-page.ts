import { Component, ChangeDetectionStrategy, signal, computed, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth/auth.service';
import { Layout } from '../layout/layout';

@Component({
	selector: 'app-reset-password-page',
	imports: [
		FormsModule,
		RouterLink,
		IftaLabelModule,
		InputTextModule,
		ButtonModule,
		MessageModule,
		Layout,
	],
	templateUrl: './reset-password-page.html',
	styleUrl: './reset-password-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
	private auth = inject(AuthService);
	private router = inject(Router);
	private messageService = inject(MessageService);

	password = signal('');
	confirmPassword = signal('');
	loading = signal(false);
	isValidSession = signal(false);

	passwordsMatch = computed(() => this.password() === this.confirmPassword());
	passwordMinLength = computed(() => this.password().length >= 6);

	canSubmit = computed(
		() =>
			this.password() &&
			this.confirmPassword() &&
			this.passwordsMatch() &&
			this.passwordMinLength() &&
			!this.loading()
	);

	showMismatchError = computed(() => this.confirmPassword() && !this.passwordsMatch());

	showMinLengthError = computed(() => this.password() && !this.passwordMinLength());

	constructor() {
		// Check URL hash for recovery type - Supabase includes type=recovery in redirect URL
		this.checkRecoveryFromUrl();

		// Listen for PASSWORD_RECOVERY event (in case it fires after component init)
		this.auth.authChanges((event, _session) => {
			if (event === 'PASSWORD_RECOVERY') {
				this.isValidSession.set(true);
			}
		});

		// Reactively check authentication status when session loads
		effect(() => {
			if (this.auth.isAuthenticated() && !this.isValidSession()) {
				// User is authenticated - either from recovery link or existing session
				// On this page, we allow password change for authenticated users
				this.isValidSession.set(true);
			}
		});
	}

	private checkRecoveryFromUrl(): void {
		// Supabase redirects with hash containing type=recovery
		// e.g., /reset-password#access_token=xxx&type=recovery
		const hash = window.location.hash.substring(1);
		const params = new URLSearchParams(hash);
		if (params.get('type') === 'recovery') {
			this.isValidSession.set(true);
		}
	}

	async submit() {
		if (!this.canSubmit()) return;

		try {
			this.loading.set(true);
			await this.auth.updatePassword(this.password());

			this.messageService.add({
				severity: 'success',
				summary: 'Sukces',
				detail: 'Hasło zostało zmienione. Możesz się teraz zalogować.',
			});

			// Sign out and redirect to login
			await this.auth.signOut();
			this.router.navigate(['/login']);
		} catch (err) {
			console.error('Password update failed:', err);
			this.messageService.add({
				severity: 'error',
				summary: 'Błąd',
				detail: 'Nie udało się zmienić hasła. Spróbuj ponownie.',
			});
		} finally {
			this.loading.set(false);
		}
	}
}
