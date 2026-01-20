import { Routes } from '@angular/router';
import { MainPage } from './components/main-page/main-page';
import { authGuard, noAuthGuard, roleGuard } from '../guards';

export const routes: Routes = [
	{
		path: '',
		component: MainPage,
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
		path: 'create-job',
		canActivate: [authGuard, roleGuard],
		loadComponent: () => import('./components/create-job-page/create-job-page').then((mod) => mod.CreateJobPage),
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
];
