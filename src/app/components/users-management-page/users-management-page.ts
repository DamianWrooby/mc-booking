import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { Layout } from '../layout/layout';
import { UserService } from '../../services/user/user.service';
import { AuthService } from '../../services/auth/auth.service';
import { ProfileDto } from '../../types';

interface RoleOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-users-management-page',
  imports: [
    Layout,
    TagModule,
    SelectModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './users-management-page.html',
  styleUrl: './users-management-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
})
export class UsersManagementPage implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  users = this.userService.items;
  loading = this.userService.loading;
  currentUserId = computed(() => this.authService.userData()?.id);

  roleOptions: RoleOption[] = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'Manager', value: 'MANAGER' },
    { label: 'User', value: 'USER' },
  ];

  ngOnInit(): void {
    this.userService.getAll();
  }

  getRoleSeverity(role: string): 'danger' | 'warn' | 'info' | 'secondary' {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'MANAGER':
        return 'warn';
      case 'USER':
        return 'info';
      default:
        return 'secondary';
    }
  }

  isCurrentUser(user: ProfileDto): boolean {
    return user.id === this.currentUserId();
  }

  onRoleChange(user: ProfileDto, newRole: string): void {
    if (newRole === user.role) return;

    this.confirmationService.confirm({
      message: `Czy na pewno chcesz zmienić rolę użytkownika "${user.username}" z "${user.role}" na "${newRole}"?`,
      header: 'Potwierdzenie zmiany roli',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Tak, zmień',
      rejectLabel: 'Anuluj',
      accept: () => {
        this.userService.updateRole(user.id, newRole, () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sukces',
            detail: `Rola użytkownika "${user.username}" została zmieniona na "${newRole}"`,
          });
        });
      },
    });
  }
}
