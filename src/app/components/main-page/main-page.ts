import {
	Component,
	ChangeDetectionStrategy,
	OnInit,
	inject,
	signal,
	effect,
	WritableSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth.service';
import { AuthSession } from '@supabase/supabase-js';
import { isEqual } from 'lodash';

@Component({
	selector: 'app-main-page',
	imports: [ButtonModule, RouterLink],
	templateUrl: './main-page.html',
	styleUrl: './main-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPage implements OnInit {
	private auth = inject(AuthService);
	private router = inject(Router);
	private session: WritableSignal<AuthSession | null> = signal(this.auth.getSession(), { equal: isEqual });

	userData = this.auth.userData();
	loading = signal(false);

	constructor() {
		effect(() => {
			console.log(`The current session is:`, this.session());
		});
	}

	ngOnInit() {
		this.auth.authChanges((_, session) => this.session.set(session));
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
