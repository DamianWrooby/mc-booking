import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-create-job-fab',
  templateUrl: './create-job-fab.html',
  styleUrl: './create-job-fab.css',
  imports: [ButtonModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateJobFab {
  private authService = inject(AuthService);
  private router = inject(Router);

  userProfile = this.authService.userProfile;

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  isVisible = computed(() => {
    const profile = this.userProfile();
    const url = this.currentUrl();
    const hasRole = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
    const notOnCreateJobPage = !url.startsWith('/create-job');
    return hasRole && notOnCreateJobPage;
  });

  createJob() {
    this.router.navigate(['/create-job']);
  }
}
