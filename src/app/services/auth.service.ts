import { computed, effect, Injectable, signal, WritableSignal } from '@angular/core';
import { AuthChangeEvent, AuthSession, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import { isEqual } from 'lodash';
import type { Tables } from '../supabase/database.types';

@Injectable({
	providedIn: 'root',
})
export class AuthService {
	email = signal('');
	password = signal('');

	credentials = computed(() => ({
		email: this.email(),
		password: this.password(),
	}));

	userData = computed(() => this._session()?.user ?? null);
	isAuthenticated = computed(() => !!this.userData());
	userProfile: WritableSignal<Tables<'Profile'> | null> = signal(null, { equal: isEqual });
	initialSessionLoading = signal(true);

	private _session: WritableSignal<AuthSession | null> = signal(null, { equal: isEqual });

	constructor() {
		this.getSession();
		this.listenToAuthChanges();

		effect(() => {
			if (this.isAuthenticated()) {
				this.getUserProfile(this.userData()?.id);
			}
		});
		effect(() => {
			console.log(`The current session is:`, this._session());
		});
	}

	authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
		return supabase.auth.onAuthStateChange(callback);
	}

	async getSession(): Promise<AuthSession | null> {
        const { data } = await supabase.auth.getSession();
        this._session.set(data.session);
        this.initialSessionLoading.set(false);
        return this._session();
    }

	async signIn(credentials: { email: string; password: string }) {
		const { email, password } = credentials;
		let { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) throw error;
		this._session.set(data.session);
		return data;
	}

	async signUp(credentials: { email: string; password: string }) {
		const { email, password } = credentials;
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
		});
		if (error) throw error;
		this._session.set(data.session);
		return data;
	}

	async signOut() {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
		this._session.set(null);
	}

	private listenToAuthChanges() {
		supabase.auth.onAuthStateChange((_event, session) => {
			this._session.set(session);
		});
	}

	private async getUserProfile(id?: string) {
		if (!id) return;

		let { data, error } = await supabase.from('Profile').select('*').eq('id', id).single();

		if (error) console.error('Cannot retrieve user profile');
		this.userProfile.set(data);
	}
}
