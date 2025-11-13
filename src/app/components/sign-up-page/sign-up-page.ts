import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { Router } from "@angular/router"
import { FormsModule } from '@angular/forms';

import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';

@Component({
	selector: 'app-sign-up-page',
	imports: [FormsModule, IftaLabelModule, InputTextModule, ButtonModule],
	templateUrl: './sign-up-page.html',
	styleUrl: './sign-up-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpPage {
	private auth = inject(AuthService);
	private router = inject(Router);

	email = signal('');
	password = signal('');
	loading = signal(false);

	buttonDisabled = computed(() => !this.email() || !this.password());

	async submit() {
		try {
			this.loading.set(true);
			await this.auth.signUp({ email: this.email(), password: this.password() });
			this.router.navigate(['']);
			console.log('✅ Signed up successfully');
			this.loading.set(false);
		} catch (err) {
			console.error('❌ Sign up failed:', err);
		} finally {
			this.loading.set(false);
		}
	}

	private resetCredentials(): void {
		this.email.set('');
		this.password.set('');
	}
}
