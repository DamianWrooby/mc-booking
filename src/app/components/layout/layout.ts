import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Toast } from 'primeng/toast';
import { BottomNav } from '../bottom-nav/bottom-nav';
import { CreateJobFab } from '../create-job-fab/create-job-fab';
import { NotificationBell } from '../notification-bell/notification-bell';

@Component({
	selector: 'app-layout',
	imports: [RouterModule, Toast, BottomNav, CreateJobFab, NotificationBell],
	templateUrl: './layout.html',
	styleUrl: './layout.css',
	host: {
		class: 'mc-booking-dark w-full pt-20 p-5 pb-20 flex flex-col justify-center items-center gap-2',
	},
})
export class Layout {
	readonly toastBreakpoints = { '640px': { width: '100%', right: '0', left: '0' } };
}
