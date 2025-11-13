import { Routes } from '@angular/router';
import { MainPage } from './components/main-page/main-page';

export const routes: Routes = [
	{
		path: '',
		component: MainPage,
	},
	{
		path: 'login',
		loadComponent: () => import('./components/login-page/login-page').then((mod) => mod.LoginPage),
	},
	{
		path: 'sign-up',
		loadComponent: () => import('./components/sign-up-page/sign-up-page').then((mod) => mod.SignUpPage),
	},
];
