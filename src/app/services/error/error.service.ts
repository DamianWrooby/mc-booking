import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
	providedIn: 'root',
})
export class ErrorService {
	private messageService = inject(MessageService);

	showError(message: string): void {
		this.messageService.add({ severity: 'error', summary: 'Error', detail: message });
	}
}
