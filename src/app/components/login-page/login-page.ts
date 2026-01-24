import { Component, ChangeDetectionStrategy, signal, computed, inject, afterNextRender } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth/auth.service';
import { Layout } from '../layout/layout';
import { AuthError } from '@supabase/supabase-js';

interface NavigationState {
	signupSuccess?: boolean;
}

@Component({
	selector: 'app-login-page',
	imports: [FormsModule, RouterLink, IftaLabelModule, InputTextModule, ButtonModule, Layout],
	templateUrl: './login-page.html',
	styleUrl: './login-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
	private readonly auth = inject(AuthService);
	private readonly router = inject(Router);
	private readonly location = inject(Location);
	private readonly messageService = inject(MessageService);

	email = signal('');
	password = signal('');
	loading = signal(false);

	buttonDisabled = computed(() => !this.email() || !this.password());

	constructor() {
		afterNextRender(() => {
			const { signupSuccess } = this.location.getState() as NavigationState;
			if (signupSuccess) {
				this.messageService.add({
					severity: 'success',
					summary: 'Sukces',
					detail: 'Konto zostało utworzone. Sprawdź email, aby potwierdzić rejestrację.',
				});
				history.replaceState({}, '');
			}
		});
	}

	async submit() {
		try {
			this.loading.set(true);
			await this.auth.signIn({ email: this.email(), password: this.password() });
			console.log('✅ Logged in successfully');
			this.loading.set(false);
			this.goToMainPage();
		} catch (err) {
			if (err instanceof AuthError && err.code === 'email_not_confirmed') {
				this.messageService.add({
					severity: 'warn',
					summary: 'Email niepotwierdzony',
					detail: 'Potwierdź swój adres email, aby się zalogować.',
				});
			} else {
				this.messageService.add({
					severity: 'error',
					summary: 'Błąd logowania',
					detail: 'Nieprawidłowy email lub hasło.',
				});
			}
		} finally {
			this.loading.set(false);
		}
	}

	private goToMainPage(): void {
		this.router.navigate(['']);
	}
}
