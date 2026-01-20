# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm start          # Start dev server (http://localhost:4200)
npm run build      # Production build (outputs to dist/)
npm test           # Run unit tests with Karma
ng generate component <name>  # Generate new component
```

## Architecture Overview

**Angular 21 zoneless application** using Supabase as the backend. Uses PrimeNG component library with TailwindCSS for styling.

### Key Technical Choices
- **Zoneless change detection** (`provideZonelessChangeDetection()`) - no Zone.js
- **Signals** for all state management (not RxJS subjects)
- **Standalone components only** - no NgModules
- **PWA enabled** with service worker in production
- **Polish locale** (`pl-PL`) as default

### Backend Integration
- Supabase client configured in `src/app/supabase/supabase-client.ts`
- Database types in `src/app/supabase/database.types.ts`
- Environment config: `src/environments/environment.ts` (prod) and `environment.development.ts` (dev)

### Authentication & Authorization
- `AuthService` (`src/app/services/auth/auth.service.ts`) manages session state via signals
- Guards in `src/guards/`: `authGuard`, `noAuthGuard`, `roleGuard`
- User roles: `ADMIN`, `MANAGER` (used in route data)

### Project Structure
```
src/app/
├── components/     # Page components and features
├── services/       # Injectable services (auth, user, job, error)
├── models/         # TypeScript interfaces
├── supabase/       # Supabase client and generated types
src/guards/         # Route guards (barrel exported from index.ts)
```

## Angular Conventions

- Do NOT set `standalone: true` in decorators (it's the default in Angular 21)
- Use `input()` and `output()` functions instead of `@Input`/`@Output` decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` on components
- Use native control flow (`@if`, `@for`, `@switch`) not structural directives
- Use `inject()` function instead of constructor injection
- Put host bindings in the `host` object, not `@HostBinding`/`@HostListener`
- Prefer `class` bindings over `ngClass`, `style` bindings over `ngStyle`
- Use signals for state, `update()` or `set()` (not `mutate`)
- Use `NgOptimizedImage` for static images

## Styling

- TailwindCSS 4 with PrimeNG integration (`tailwindcss-primeui`)
- Dark mode selector: `.mc-booking-dark`
- PrimeNG Aura theme with custom sky-blue primary palette

## Code Formatting

Prettier configured with:
- 100 char print width
- Single quotes
- Angular HTML parser for `.html` files

## Research-Plan-Implement Framework

This repository uses the Research-Plan-Implement framework with the following workflow commands:

1. `/1_research_codebase` - Deep codebase exploration with parallel AI agents
2. `/2_create_plan` - Create detailed, phased implementation plans
3. `/3_validate_plan` - Verify implementation matches plan
4. `/4_implement_plan` - Execute plan systematically
5. `/5_save_progress` - Save work session state
6. `/6_resume_work` - Resume from saved session 
7. `/7_research_cloud` - Analyze cloud infrastructure (READ-ONLY)
	
Research findings are saved in `thoughts/shared/research/`
Implementation plans are saved in `thoughts/shared/plans/`
Session summaries are saved in `thoughts/shared/sessions/`
Cloud analyses are saved in `thoughts/shared/cloud/`
