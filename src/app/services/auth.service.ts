import { computed, effect, Injectable, signal, untracked, WritableSignal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthChangeEvent, AuthSession, createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase/supabase-client';
import { isEqual } from 'lodash';
import type { Database, Tables } from '../supabase/database.types';

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

	private supabase: SupabaseClient<Database>;
	private _session: WritableSignal<AuthSession | null> = signal(null, { equal: isEqual });

	constructor() {
		this.supabase = createClient<Database>(environment.supabaseUrl, environment.supabaseKey);
		this.restoreSession();
		this.listenToAuthChanges();

		effect(() => {
			if (this.isAuthenticated()) {
				this.getUserProfile(this.userData()?.id);
			}
		});
	}

	authChanges(callback: (event: AuthChangeEvent, session: Session | null) => void) {
		return this.supabase.auth.onAuthStateChange(callback);
	}

	getSession(): AuthSession | null {
		this.supabase.auth.getSession().then(({ data }) => {
			this._session.set(data.session);
		});
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

	private async restoreSession() {
		const { data } = await supabase.auth.getSession();
		this._session.set(data.session);
	}

	private listenToAuthChanges() {
		supabase.auth.onAuthStateChange((_event, session) => {
			this._session.set(session);
		});
	}

	private async getUserProfile(id?: string) {
		if (!id) return;

		let { data, error } = await this.supabase.from('Profile').select('*').eq('id', id).single();

		if (error) console.error('Cannot retrieve user profile');
		this.userProfile.set(data);
	}
}
