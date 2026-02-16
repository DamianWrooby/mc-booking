// Deno global types for IDE support
// These are used when the Deno VSCode extension is not active

declare namespace Deno {
	export interface Env {
		get(key: string): string | undefined;
		set(key: string, value: string): void;
		delete(key: string): void;
		has(key: string): boolean;
		toObject(): { [key: string]: string };
	}

	export const env: Env;

	export interface ServeOptions {
		port?: number;
		hostname?: string;
		signal?: AbortSignal;
		onListen?: (params: { hostname: string; port: number }) => void;
		onError?: (error: unknown) => Response | Promise<Response>;
	}

	export function serve(
		handler: (request: Request, info?: { remoteAddr: { hostname: string } }) => Response | Promise<Response>,
		options?: ServeOptions
	): { finished: Promise<void>; shutdown(): Promise<void>; ref(): void; unref(): void };
}

// Module declaration for npm import
declare module 'npm:@supabase/supabase-js@2' {
	export function createClient(
		supabaseUrl: string,
		supabaseKey: string,
		options?: object
	): {
		from(table: string): {
			select(columns?: string): {
				eq(column: string, value: unknown): Promise<{ data: unknown[] | null; error: Error | null }>;
			};
			delete(): {
				eq(column: string, value: unknown): Promise<{ error: Error | null }>;
			};
		};
	};
}
