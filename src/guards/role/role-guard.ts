import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../app/services/auth/auth.service';

export const roleGuard: CanActivateFn = async (route) => {
	const authService = inject(AuthService);
	const router = inject(Router);

	if (authService.initialSessionLoading()) {
		await authService.getSession();
	}

	await authService.ensureProfileLoaded();

	const allowedRoles: string[] = route.data['allowedRoles'];
	const userRole = authService.userProfile()?.role;

	if (!userRole || !allowedRoles.includes(userRole)) {
		return router.parseUrl('/');
	}

	return true;
};
