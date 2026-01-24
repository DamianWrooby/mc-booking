import { Component, ChangeDetectionStrategy, inject, afterNextRender, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
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
	private readonly errorService = inject(ErrorService);
	loading = signal(true);

	ngOnInit() {
		this.handleConfirmation();
	}

	private handleConfirmation(): void {
		const hash = window.location.hash.substring(1);
		const params = new URLSearchParams(hash);
		const type = params.get('type');

		console.log('Confirm email - hash:', hash);
		console.log('Confirm email - type:', type);

		if (hash.includes('error')) {
			this.errorService.showError('Nie można potwierdzić adresu email. Spróbuj ponownie za chwilę.');
		}

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
