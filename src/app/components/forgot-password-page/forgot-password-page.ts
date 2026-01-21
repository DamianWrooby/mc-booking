import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth/auth.service';
import { Layout } from '../layout/layout';

@Component({
	selector: 'app-forgot-password-page',
	imports: [FormsModule, RouterLink, IftaLabelModule, InputTextModule, ButtonModule, Layout],
	templateUrl: './forgot-password-page.html',
	styleUrl: './forgot-password-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
	private auth = inject(AuthService);
	private messageService = inject(MessageService);

	email = signal('');
	loading = signal(false);
	emailSent = signal(false);

	buttonDisabled = computed(() => !this.email() || this.loading());

	async submit() {
		try {
			this.loading.set(true);
			await this.auth.resetPasswordForEmail(this.email());
			this.emailSent.set(true);
			this.messageService.add({
				severity: 'success',
				summary: 'Sukces',
				detail: 'Link do resetowania hasła został wysłany na podany adres email',
			});
		} catch (err) {
			console.error('Password reset request failed:', err);
			this.messageService.add({
				severity: 'error',
				summary: 'Błąd',
				detail: 'Nie udało się wysłać linku. Sprawdź adres email i spróbuj ponownie.',
			});
		} finally {
			this.loading.set(false);
		}
	}
}
