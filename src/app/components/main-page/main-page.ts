import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../services/auth.service';
import { Layout } from '../layout/layout';
import { HttpClient } from '@angular/common/http';

@Component({
	selector: 'app-main-page',
	imports: [Layout, ButtonModule, ProgressSpinnerModule, RouterLink],
	templateUrl: './main-page.html',
	styleUrl: './main-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPage {
	private auth = inject(AuthService);
	private router = inject(Router);
	private http = inject(HttpClient);

	userData = computed(() => this.auth.userData());
	initialSessionLoading = computed(() => this.auth.initialSessionLoading());
	loading = signal(false);

	readonly URI_1 = 'https://jsonplaceholder.typicode.com/todos/1';
	readonly URI_2 = 'https://jsonplaceholder.typicode.com/todos/2';
	readonly URI_3 = 'https://jsonplaceholder.typicode.com/todos/3';

	constructor() {
		effect(() => {
			console.log('User Data:', this.userData());
		});
	}

	async logout() {
		try {
			this.loading.set(true);
			await this.auth.signOut();
			console.log('✅ Signed out successfully');
			this.loading.set(false);
			this.goToLoginPage();
		} catch (err) {
			console.error('❌ Sign out failed:', err);
		} finally {
			this.loading.set(false);
		}
	}

	private goToLoginPage(): void {
		this.router.navigate(['login']);
	}
}
