import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { RippleModule } from 'primeng/ripple';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.css',
  imports: [CommonModule, RouterLink, RouterLinkActive, ButtonModule, PopoverModule, RippleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  private authService = inject(AuthService);
  private router = inject(Router);

  isAuthenticated = this.authService.isAuthenticated;

  navigateAndClosePopover(popover: any, route: string) {
    popover.hide();
    this.router.navigate([route]);
  }
}
