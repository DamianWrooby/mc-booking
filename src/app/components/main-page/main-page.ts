import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../services/auth/auth.service';
import { Layout } from '../layout/layout';

@Component({
	selector: 'app-main-page',
	imports: [Layout, ButtonModule, ProgressSpinnerModule, RouterLink],
	templateUrl: './main-page.html',
	styleUrl: './main-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPage {
	private auth = inject(AuthService);

	userData = this.auth.userData;
	initialSessionLoading = this.auth.initialSessionLoading;
	loading = signal(false);

	constructor() {
		effect(() => {
			console.log('User Data:', this.userData());
		});
	}

	async logout() {
		this.loading.set(true);

		try {
			await this.auth.signOutAndRedirect();
			console.log('✅ Signed out successfully');
		} catch (err) {
			console.error('❌ Sign out failed:', err);
		} finally {
			this.loading.set(false);
		}
	}
}
