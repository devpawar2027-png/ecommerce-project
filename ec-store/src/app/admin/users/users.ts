import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUserDetails, AdminUserService } from '../services/user.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(AdminUserService);

  readonly users = signal<AdminUserDetails[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<'all' | 'active' | 'deleted'>('all');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);

  // Modals
  readonly isProfileModalOpen = signal<boolean>(false);
  readonly isActionModalOpen = signal<boolean>(false);

  selectedUser = signal<AdminUserDetails | null>(null);
  actionUser = signal<AdminUserDetails | null>(null);
  actionType = signal<'delete' | 'restore'>('delete');

  // Alerts
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();

    let list = this.users();

    if (st === 'active') {
      list = list.filter((u) => !u.is_deleted);
    } else if (st === 'deleted') {
      list = list.filter((u) => !!u.is_deleted);
    }

    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.mobile && u.mobile.includes(q)) ||
          String(u.id).includes(q)
      );
    }

    return list;
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize()));
  });

  readonly paginatedUsers = computed(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredUsers().slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showError('Failed to load registered users');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(value: 'all' | 'active' | 'deleted'): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  viewProfile(user: AdminUserDetails): void {
    this.selectedUser.set(user);
    this.isProfileModalOpen.set(true);
  }

  closeProfileModal(): void {
    this.isProfileModalOpen.set(false);
    this.selectedUser.set(null);
  }

  openActionModal(user: AdminUserDetails, type: 'delete' | 'restore'): void {
    this.actionUser.set(user);
    this.actionType.set(type);
    this.isActionModalOpen.set(true);
  }

  closeActionModal(): void {
    this.isActionModalOpen.set(false);
    this.actionUser.set(null);
  }

  confirmAction(): void {
    const user = this.actionUser();
    if (!user) return;

    this.isSubmitting.set(true);

    if (this.actionType() === 'delete') {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.showSuccess(`Customer "${user.name}" soft deleted successfully.`);
          this.closeActionModal();
          this.loadUsers();
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.showError(err.error?.detail || 'Failed to soft delete user');
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.userService.restoreUser(user.id).subscribe({
        next: () => {
          this.showSuccess(`Customer "${user.name}" restored successfully.`);
          this.closeActionModal();
          this.loadUsers();
          this.isSubmitting.set(false);
        },
        error: (err) => {
          this.showError(err.error?.detail || 'Failed to restore user');
          this.isSubmitting.set(false);
        },
      });
    }
  }

  showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 3500);
  }

  showError(msg: string): void {
    this.errorMessage.set(msg);
    setTimeout(() => this.errorMessage.set(null), 4000);
  }
}
