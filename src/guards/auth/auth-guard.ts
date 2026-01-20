import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../app/services/auth/auth.service';

export const authGuard: CanActivateFn = async () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (authService.initialSessionLoading()) {
		await authService.getSession();
	}

	if (authService.isAuthenticated()) {
		return true;
	}

	return router.parseUrl('/login');
};
