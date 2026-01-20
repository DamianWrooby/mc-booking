# Password Reset Implementation Plan

## Overview
Implement a complete password reset flow allowing users to recover their accounts via email. This includes a "Forgot password" page to request reset emails, a "Reset password" page to set a new password, and integration with Supabase authentication.

## Current State Analysis
- **AuthService** has sign-in/sign-up/sign-out methods but no password reset capabilities
- **Login page** has no link to password recovery
- **Supabase** provides `resetPasswordForEmail()` and `updateUser()` methods that are not yet utilized
- Auth state listener exists but doesn't handle `PASSWORD_RECOVERY` event

## Desired End State
- Users can click "Zapomniałeś hasła?" on the login page
- Users enter their email and receive a password reset link
- Clicking the link redirects to the app where they can set a new password
- After successful reset, users are redirected to login with a success message
- All UI text is in Polish to match existing pages

## What We're NOT Doing
- Email template customization (uses Supabase default)
- Password strength validation (can be added later)
- Rate limiting UI feedback (handled by Supabase server-side)
- "Change password" for logged-in users (separate feature)

## Implementation Approach
Follow existing patterns: signals for state, OnPush change detection, PrimeNG components, Layout wrapper, toast notifications for feedback. The Supabase flow handles token exchange automatically via the auth state listener.

---

## Phase 1: AuthService Extension

### Overview
Add two new methods to AuthService for password reset functionality.

### Changes Required:

#### 1. AuthService
**File**: `src/app/services/auth/auth.service.ts`
**Changes**: Add `resetPasswordForEmail` and `updatePassword` methods

Add after `signOutAndRedirect()` method (after line 86):

```typescript
async resetPasswordForEmail(email: string): Promise<void> {
	const { error } = await supabase.auth.resetPasswordForEmail(email, {
		redirectTo: `${window.location.origin}/reset-password`,
	});
	if (error) throw error;
}

async updatePassword(newPassword: string): Promise<void> {
	const { error } = await supabase.auth.updateUser({
		password: newPassword,
	});
	if (error) throw error;
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Existing tests pass: `npm test`

#### Manual Verification:
- [ ] Methods are accessible from AuthService instance

---

## Phase 2: Forgot Password Page

### Overview
Create a new page where users enter their email to request a password reset link.

### Changes Required:

#### 1. Create Component Files
**Directory**: `src/app/components/forgot-password-page/`

**File**: `src/app/components/forgot-password-page/forgot-password-page.ts`

```typescript
import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth/auth.service';
import { Layout } from '../layout/layout';

@Component({
	selector: 'app-forgot-password-page',
	imports: [FormsModule, RouterLink, IftaLabelModule, InputTextModule, ButtonModule, Layout],
	templateUrl: './forgot-password-page.html',
	styleUrl: './forgot-password-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
	private auth = inject(AuthService);
	private messageService = inject(MessageService);

	email = signal('');
	loading = signal(false);
	emailSent = signal(false);

	buttonDisabled = computed(() => !this.email() || this.loading());

	async submit() {
		try {
			this.loading.set(true);
			await this.auth.resetPasswordForEmail(this.email());
			this.emailSent.set(true);
			this.messageService.add({
				severity: 'success',
				summary: 'Sukces',
				detail: 'Link do resetowania hasła został wysłany na podany adres email',
			});
		} catch (err) {
			console.error('Password reset request failed:', err);
			this.messageService.add({
				severity: 'error',
				summary: 'Błąd',
				detail: 'Nie udało się wysłać linku. Sprawdź adres email i spróbuj ponownie.',
			});
		} finally {
			this.loading.set(false);
		}
	}
}
```

**File**: `src/app/components/forgot-password-page/forgot-password-page.html`

```html
<app-layout>
	<div class="w-full max-w-md flex flex-col gap-4">
		<h1 class="text-2xl font-bold text-center mb-2">Resetowanie hasła</h1>

		@if (!emailSent()) {
			<p class="text-surface-500 dark:text-surface-400 text-center mb-4">
				Podaj adres email powiązany z Twoim kontem. Wyślemy Ci link do zresetowania hasła.
			</p>

			<p-iftalabel>
				<input
					pInputText
					id="email"
					type="email"
					[ngModel]="email()"
					(ngModelChange)="email.set($event)"
					autocomplete="email"
					class="w-full"
				/>
				<label for="email">Email</label>
			</p-iftalabel>

			<p-button
				label="Wyślij link"
				[loading]="loading()"
				[disabled]="buttonDisabled()"
				(onClick)="submit()"
				styleClass="w-full"
			/>
		} @else {
			<div class="text-center">
				<p class="text-surface-500 dark:text-surface-400 mb-4">
					Sprawdź swoją skrzynkę pocztową. Jeśli konto z podanym adresem email istnieje,
					otrzymasz wiadomość z linkiem do zresetowania hasła.
				</p>
			</div>
		}

		<div class="text-center mt-4">
			<a routerLink="/login" class="text-primary hover:underline">
				Powrót do logowania
			</a>
		</div>
	</div>
</app-layout>
```

**File**: `src/app/components/forgot-password-page/forgot-password-page.css`

```css
/* Empty - styles handled by Tailwind */
```

#### 2. Add Route
**File**: `src/app/app.routes.ts`
**Changes**: Add route for forgot-password page

Add after the `sign-up` route (after line 20):

```typescript
{
	path: 'forgot-password',
	canActivate: [noAuthGuard],
	loadComponent: () =>
		import('./components/forgot-password-page/forgot-password-page').then(
			(mod) => mod.ForgotPasswordPage
		),
},
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Route is accessible at `/forgot-password`

#### Manual Verification:
- [ ] Page displays correctly with email input
- [ ] "Wyślij link" button is disabled when email is empty
- [ ] Submitting shows loading state
- [ ] Success shows confirmation message
- [ ] Error shows toast notification
- [ ] "Powrót do logowania" link works

---

## Phase 3: Reset Password Page

### Overview
Create the page where users land after clicking the email link. They enter and confirm their new password.

### Changes Required:

#### 1. Create Component Files
**Directory**: `src/app/components/reset-password-page/`

**File**: `src/app/components/reset-password-page/reset-password-page.ts`

```typescript
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { InputTextModule } from 'primeng/inputtext';
import { IftaLabelModule } from 'primeng/iftalabel';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth/auth.service';
import { Layout } from '../layout/layout';

@Component({
	selector: 'app-reset-password-page',
	imports: [
		FormsModule,
		IftaLabelModule,
		InputTextModule,
		ButtonModule,
		MessageModule,
		Layout,
	],
	templateUrl: './reset-password-page.html',
	styleUrl: './reset-password-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage implements OnInit {
	private auth = inject(AuthService);
	private router = inject(Router);
	private messageService = inject(MessageService);

	password = signal('');
	confirmPassword = signal('');
	loading = signal(false);
	isValidSession = signal(false);

	passwordsMatch = computed(() => this.password() === this.confirmPassword());
	passwordMinLength = computed(() => this.password().length >= 6);

	canSubmit = computed(
		() =>
			this.password() &&
			this.confirmPassword() &&
			this.passwordsMatch() &&
			this.passwordMinLength() &&
			!this.loading()
	);

	showMismatchError = computed(
		() => this.confirmPassword() && !this.passwordsMatch()
	);

	showMinLengthError = computed(
		() => this.password() && !this.passwordMinLength()
	);

	ngOnInit() {
		// Check if user arrived via password recovery link
		// Supabase automatically handles the token exchange
		this.auth.authChanges((event, session) => {
			if (event === 'PASSWORD_RECOVERY') {
				this.isValidSession.set(true);
			}
		});

		// Also check if already authenticated (session restored)
		if (this.auth.isAuthenticated()) {
			this.isValidSession.set(true);
		}
	}

	async submit() {
		if (!this.canSubmit()) return;

		try {
			this.loading.set(true);
			await this.auth.updatePassword(this.password());

			this.messageService.add({
				severity: 'success',
				summary: 'Sukces',
				detail: 'Hasło zostało zmienione. Możesz się teraz zalogować.',
			});

			// Sign out and redirect to login
			await this.auth.signOut();
			this.router.navigate(['/login']);
		} catch (err) {
			console.error('Password update failed:', err);
			this.messageService.add({
				severity: 'error',
				summary: 'Błąd',
				detail: 'Nie udało się zmienić hasła. Spróbuj ponownie.',
			});
		} finally {
			this.loading.set(false);
		}
	}
}
```

**File**: `src/app/components/reset-password-page/reset-password-page.html`

```html
<app-layout>
	<div class="w-full max-w-md flex flex-col gap-4">
		<h1 class="text-2xl font-bold text-center mb-2">Ustaw nowe hasło</h1>

		@if (isValidSession()) {
			<p class="text-surface-500 dark:text-surface-400 text-center mb-4">
				Wprowadź nowe hasło dla swojego konta.
			</p>

			<p-iftalabel>
				<input
					pInputText
					id="password"
					type="password"
					[ngModel]="password()"
					(ngModelChange)="password.set($event)"
					autocomplete="new-password"
					class="w-full"
				/>
				<label for="password">Nowe hasło</label>
			</p-iftalabel>

			@if (showMinLengthError()) {
				<p-message severity="error" text="Hasło musi mieć co najmniej 6 znaków" />
			}

			<p-iftalabel>
				<input
					pInputText
					id="confirmPassword"
					type="password"
					[ngModel]="confirmPassword()"
					(ngModelChange)="confirmPassword.set($event)"
					autocomplete="new-password"
					class="w-full"
				/>
				<label for="confirmPassword">Potwierdź hasło</label>
			</p-iftalabel>

			@if (showMismatchError()) {
				<p-message severity="error" text="Hasła nie są identyczne" />
			}

			<p-button
				label="Zmień hasło"
				[loading]="loading()"
				[disabled]="!canSubmit()"
				(onClick)="submit()"
				styleClass="w-full mt-2"
			/>
		} @else {
			<div class="text-center">
				<p class="text-surface-500 dark:text-surface-400 mb-4">
					Link do resetowania hasła wygasł lub jest nieprawidłowy.
				</p>
				<a routerLink="/forgot-password" class="text-primary hover:underline">
					Wyślij nowy link
				</a>
			</div>
		}
	</div>
</app-layout>
```

**File**: `src/app/components/reset-password-page/reset-password-page.css`

```css
/* Empty - styles handled by Tailwind */
```

#### 2. Add Route
**File**: `src/app/app.routes.ts`
**Changes**: Add route for reset-password page

Add after the `forgot-password` route:

```typescript
{
	path: 'reset-password',
	loadComponent: () =>
		import('./components/reset-password-page/reset-password-page').then(
			(mod) => mod.ResetPasswordPage
		),
},
```

Note: This route does NOT use `noAuthGuard` because the user will be temporarily authenticated via the reset token.

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Route is accessible at `/reset-password`

#### Manual Verification:
- [ ] Invalid/expired link shows appropriate message
- [ ] Valid link shows password form
- [ ] Passwords must match to submit
- [ ] Passwords must be at least 6 characters
- [ ] Successful reset shows toast and redirects to login
- [ ] Error shows toast notification

---

## Phase 4: Login Page Update

### Overview
Add a "Zapomniałeś hasła?" link to the login page.

### Changes Required:

#### 1. Update Login Page Template
**File**: `src/app/components/login-page/login-page.html`
**Changes**: Add forgot password link

Replace entire file content:

```html
<app-layout>
	<p-iftalabel>
		<input
			pInputText
			id="email"
			[ngModel]="email()"
			(ngModelChange)="email.set($event)"
			autocomplete="email"
		/>
		<label for="email">Email</label>
	</p-iftalabel>
	<p-iftalabel>
		<input
			pInputText
			type="password"
			id="password"
			[ngModel]="password()"
			(ngModelChange)="password.set($event)"
			autocomplete="off"
		/>
		<label for="password">Hasło</label>
	</p-iftalabel>
	<div class="w-full text-right">
		<a routerLink="/forgot-password" class="text-sm text-primary hover:underline">
			Zapomniałeś hasła?
		</a>
	</div>
	<div class="card flex justify-center">
		<p-button
			label="Zatwierdź"
			[loading]="loading()"
			[disabled]="buttonDisabled()"
			(onClick)="submit()"
		/>
	</div>
</app-layout>
```

#### 2. Update Login Page Component
**File**: `src/app/components/login-page/login-page.ts`
**Changes**: Add RouterLink import

Update the imports array (line 13):

```typescript
imports: [FormsModule, RouterLink, IftaLabelModule, InputTextModule, ButtonModule, Layout],
```

Add to the Angular imports at the top of the file:

```typescript
import { RouterLink } from '@angular/router';
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run build`

#### Manual Verification:
- [ ] "Zapomniałeś hasła?" link is visible on login page
- [ ] Clicking the link navigates to `/forgot-password`

---

## Testing Strategy

### Manual Testing Steps:

1. **Forgot Password Flow**:
   - Navigate to `/login`
   - Click "Zapomniałeś hasła?"
   - Enter a valid email address
   - Click "Wyślij link"
   - Verify success message appears
   - Check email for reset link

2. **Reset Password Flow**:
   - Click the link from the email
   - Verify redirect to `/reset-password`
   - Enter mismatched passwords → verify error
   - Enter matching passwords < 6 chars → verify error
   - Enter valid matching passwords
   - Click "Zmień hasło"
   - Verify redirect to `/login` with success toast

3. **Invalid Link Handling**:
   - Navigate directly to `/reset-password` without a token
   - Verify "link expired" message appears

4. **Login Page**:
   - Verify "Zapomniałeś hasła?" link is visible
   - Verify link navigates correctly

### Edge Cases:
- Non-existent email (Supabase still returns success for security)
- Expired reset link
- Using the same reset link twice
- Network errors during submission

## Supabase Configuration Required

Before testing, ensure the following is configured in Supabase Dashboard:

1. **Authentication → URL Configuration → Redirect URLs**:
   - Add: `http://localhost:4200/reset-password` (development)
   - Add: `https://your-production-domain.com/reset-password` (production)

2. **Authentication → Email Templates** (optional):
   - Customize the "Reset Password" email template if desired

## Files Modified/Created Summary

| Action | File Path |
|--------|-----------|
| Modified | `src/app/services/auth/auth.service.ts` |
| Created | `src/app/components/forgot-password-page/forgot-password-page.ts` |
| Created | `src/app/components/forgot-password-page/forgot-password-page.html` |
| Created | `src/app/components/forgot-password-page/forgot-password-page.css` |
| Created | `src/app/components/reset-password-page/reset-password-page.ts` |
| Created | `src/app/components/reset-password-page/reset-password-page.html` |
| Created | `src/app/components/reset-password-page/reset-password-page.css` |
| Modified | `src/app/components/login-page/login-page.ts` |
| Modified | `src/app/components/login-page/login-page.html` |
| Modified | `src/app/app.routes.ts` |
