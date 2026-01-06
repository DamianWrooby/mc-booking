import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Toast } from 'primeng/toast';

@Component({
	selector: 'app-layout',
	imports: [RouterModule, Toast],
	templateUrl: './layout.html',
	styleUrl: './layout.css',
	host: {
		class: 'mc-booking-dark w-full pt-20 p-5 flex flex-col justify-center items-center gap-2',
	},
})
export class Layout {}
