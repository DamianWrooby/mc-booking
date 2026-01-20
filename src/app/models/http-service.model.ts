import { Signal } from '@angular/core';

export interface HttpService<T> {
	readonly items: Signal<T[] | null>;
	readonly selectedItem: Signal<T | null>;
	readonly loading: Signal<boolean>;
	readonly error: Signal<string | null>;

	getAll?(): void;
	getById?(id: string): void;
	create?(T: Omit<T, 'id'>): void;
	update?(id: string, entity: Partial<T>): void;
	delete?(id: string): void;
}
