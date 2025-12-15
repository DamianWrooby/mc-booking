import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../../app/services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
	const authService = inject(AuthService);

    const allowedRoles: string[] = route.data['allowedRoles'];
  	const userRole = authService.userProfile()?.role;

	if (!userRole) return false;
  	return allowedRoles.includes(userRole);
};
