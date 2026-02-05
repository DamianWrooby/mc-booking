import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../services/auth/auth.service';
import { ErrorService } from '../../services/error/error.service';
import { Layout } from '../layout/layout';

@Component({
	selector: 'app-confirm-email-page',
	imports: [ProgressSpinnerModule, Layout],
	template: `
		<app-layout>
			<div class="flex items-center justify-center min-h-screen">
				@if (loading()) {
					<div class="text-center">
						<p-progressSpinner />
						<p class="mt-4 text-muted-color">Potwierdzanie adresu email...</p>
					</div>
				}
			</div>
		</app-layout>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmEmailPage implements OnInit {
	private readonly router = inject(Router);
	private readonly authService = inject(AuthService);
	private readonly errorService = inject(ErrorService);
	loading = signal(true);

	ngOnInit() {
		this.handleConfirmation();
	}

	private async handleConfirmation(): Promise<void> {
		const hash = window.location.hash.substring(1);
		const params = new URLSearchParams(hash);
		const type = params.get('type');

		console.log('Confirm email - hash:', hash);
		console.log('Confirm email - type:', type);

		if (hash.includes('error')) {
			this.errorService.showError('Nie można potwierdzić adresu email. Spróbuj ponownie za chwilę.');
			this.loading.set(false);
			return;
		}

		// Sign out to clear the auto-session created by Supabase from the URL tokens
		// This ensures the user is redirected to login page to authenticate manually
		await this.authService.signOut();

		if (type === 'signup') {
			this.router.navigate(['/login'], {
				state: { emailConfirmed: true },
			});
		} else {
			this.router.navigate(['/login']);
		}

		this.loading.set(false);
	}
}
