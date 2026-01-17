import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.css',
  imports: [CommonModule, RouterLink, RouterLinkActive, ButtonModule, RippleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  private authService = inject(AuthService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  isAuthenticated = this.authService.isAuthenticated;
  moreMenuOpen = signal(false);

  toggleMoreMenu() {
    this.moreMenuOpen.update((v) => !v);
  }

  closeMoreMenu() {
    this.moreMenuOpen.set(false);
  }

  navigateTo(route: string) {
    this.closeMoreMenu();
    this.router.navigate([route]);
  }

  async logout() {
    this.closeMoreMenu();
	
    await this.authService.signOutAndRedirect();
    this.messageService.add({
      severity: 'success',
      summary: 'Wylogowano',
      detail: 'Zostałeś pomyślnie wylogowany',
    });
  }
}
