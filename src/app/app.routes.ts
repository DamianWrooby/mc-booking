import { Routes } from '@angular/router';
import { MainPage } from './components/main-page/main-page';
import { authGuard, noAuthGuard, roleGuard } from '../guards';

export const routes: Routes = [
	{
		path: '',
		component: MainPage,
		canActivate: [authGuard],
	},
	{
		path: 'login',
		canActivate: [noAuthGuard],
		loadComponent: () => import('./components/login-page/login-page').then((mod) => mod.LoginPage),
	},
	{
		path: 'sign-up',
		canActivate: [noAuthGuard],
		loadComponent: () => import('./components/sign-up-page/sign-up-page').then((mod) => mod.SignUpPage),
	},
	{
		path: 'forgot-password',
		canActivate: [noAuthGuard],
		loadComponent: () =>
			import('./components/forgot-password-page/forgot-password-page').then(
				(mod) => mod.ForgotPasswordPage
			),
	},
	{
		path: 'reset-password',
		loadComponent: () =>
			import('./components/reset-password-page/reset-password-page').then(
				(mod) => mod.ResetPasswordPage
			),
	},
	{
		path: 'create-job',
		canActivate: [authGuard, roleGuard],
		loadComponent: () => import('./components/create-job-page/create-job-page').then((mod) => mod.CreateJobPage),
		data: { allowedRoles: ['ADMIN', 'MANAGER'] }
	},
	{
		path: 'edit-job/:id',
		canActivate: [authGuard, roleGuard],
		loadComponent: () => import('./components/edit-job-page/edit-job-page').then((mod) => mod.EditJobPage),
		data: { allowedRoles: ['ADMIN', 'MANAGER'] }
	},
	{
		path: 'job-list',
		canActivate: [authGuard],
		loadComponent: () => import('./components/job-list-page/job-list-page').then((mod) => mod.JobListPage),
	},
	{
		path: 'my-jobs',
		canActivate: [authGuard],
		loadComponent: () => import('./components/my-jobs-page/my-jobs-page').then((mod) => mod.MyJobsPage),
	},
	{
		path: 'my-account',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./components/my-account-page/my-account-page').then((mod) => mod.MyAccountPage),
	},
	{
		path: 'users-management',
		canActivate: [authGuard, roleGuard],
		loadComponent: () =>
			import('./components/users-management-page/users-management-page').then(
				(mod) => mod.UsersManagementPage
			),
		data: { allowedRoles: ['ADMIN'] },
	},
];
