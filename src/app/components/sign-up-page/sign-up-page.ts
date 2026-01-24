import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth/auth.service';
import { Layout } from '../layout/layout';

@Component({
	selector: 'app-sign-up-page',
	imports: [FormsModule, RouterLink, IftaLabelModule, InputTextModule, ButtonModule, MessageModule, Layout],
	templateUrl: './sign-up-page.html',
	styleUrl: './sign-up-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpPage {
	private auth = inject(AuthService);
	private router = inject(Router);
	private messageService = inject(MessageService);

	email = signal('');
	password = signal('');
	confirmPassword = signal('');
	loading = signal(false);

	passwordsMatch = computed(() => this.password() === this.confirmPassword());
	passwordMinLength = computed(() => this.password().length >= 6);

	canSubmit = computed(
		() =>
			this.email() &&
			this.password() &&
			this.confirmPassword() &&
			this.passwordsMatch() &&
			this.passwordMinLength() &&
			!this.loading()
	);

	showMismatchError = computed(() => this.confirmPassword() && !this.passwordsMatch());
	showMinLengthError = computed(() => this.password() && !this.passwordMinLength());

	async submit() {
		if (!this.canSubmit()) return;

		try {
			this.loading.set(true);
			await this.auth.signUp({ email: this.email(), password: this.password() });

			this.router.navigate(['/login'], { state: { signupSuccess: true } });
		} catch (err) {
			console.error('Sign up failed:', err);
			this.messageService.add({
				severity: 'error',
				summary: 'Błąd',
				detail: 'Nie udało się utworzyć konta. Spróbuj ponownie.',
			});
		} finally {
			this.loading.set(false);
		}
	}
}
