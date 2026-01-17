import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Layout } from '../layout/layout';
import { EventCalendar } from '../event-calendar/event-calendar';

@Component({
	selector: 'app-main-page',
	imports: [Layout, EventCalendar],
	templateUrl: './main-page.html',
	styleUrl: './main-page.css',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainPage {}
