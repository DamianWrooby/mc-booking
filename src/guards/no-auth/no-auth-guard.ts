import { inject } from '@angular/core';
import { CanActivateFn, Router  } from '@angular/router';
import { AuthService } from '../../app/services/auth/auth.service';

export const noAuthGuard: CanActivateFn = async () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	await authService.getSession();

	if (authService.isAuthenticated()) {
		return router.parseUrl('/');
	}

	return true;
};
