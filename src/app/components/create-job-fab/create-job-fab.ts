import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
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

  isVisible = computed(() => {
    const profile = this.userProfile();
    return profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
  });

  createJob() {
    this.router.navigate(['/create-job']);
  }
}
