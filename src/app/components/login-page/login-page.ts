import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth/auth.service';
import { Router } from '@angular/router';
import { Layout } from '../layout/layout';

@Component({
	selector: 'app-login-page',
	imports: [FormsModule, IftaLabelModule, InputTextModule, ButtonModule, Layout],
	templateUrl: './login-page.html',
	styleUrl: './login-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
	private auth = inject(AuthService);
	private router = inject(Router);

	email = signal('');
	password = signal('');
	loading = signal(false);

	buttonDisabled = computed(() => !this.email() || !this.password());

	async submit() {
		try {
			this.loading.set(true);
			await this.auth.signIn({ email: this.email(), password: this.password() });
			console.log('✅ Logged in successfully');
			this.loading.set(false);
			this.goToMainPage();
		} catch (err) {
			console.error('❌ Login failed:', err);
		} finally {
			this.loading.set(false);
		}
	}

	private goToMainPage(): void {
		this.router.navigate(['']);
	}
}
