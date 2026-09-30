import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminOrder, AdminOrderService, OrderStatus } from '../services/order.service';
import { AdminUserService, AdminUserDetails } from '../services/user.service';
import { AdminProductService, AdminProduct } from '../services/product.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class OrdersComponent implements OnInit {
  private readonly orderService = inject(AdminOrderService);
  private readonly userService = inject(AdminUserService);
  private readonly productService = inject(AdminProductService);
  private readonly toast = inject(ToastService);

  readonly orders = signal<AdminOrder[]>([]);
  readonly users = signal<AdminUserDetails[]>([]);
  readonly products = signal<AdminProduct[]>([]);

  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('all');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);

  // Modals state
  readonly isDetailsModalOpen = signal<boolean>(false);
  readonly isDeleteModalOpen = signal<boolean>(false);

  selectedOrder = signal<AdminOrder | null>(null);
  orderToDelete = signal<AdminOrder | null>(null);
  selectedStatus: OrderStatus = 'Pending';

  // Alerts
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  readonly statuses: OrderStatus[] = [
    'Pending',
    'Confirmed',
    'Shipped',
    'Delivered',
    'Cancelled',
  ];

  readonly filteredOrders = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter().toLowerCase();

    let list = this.orders().filter((o) => !o.is_deleted);

    if (st !== 'all') {
      list = list.filter((o) => (o.status || 'Pending').toLowerCase() === st);
    }

    if (q) {
      list = list.filter(
        (o) =>
          String(o.id).includes(q) ||
          String(o.user_id).includes(q) ||
          String(o.product_id).includes(q) ||
          this.getUserName(o.user_id).toLowerCase().includes(q) ||
          this.getProductName(o.product_id).toLowerCase().includes(q) ||
          (o.status || '').toLowerCase().includes(q)
      );
    }

    return list;
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredOrders().length / this.pageSize()));
  });

  readonly paginatedOrders = computed(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredOrders().slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (users) => this.users.set(users || []),
      error: () => {},
    });

    this.productService.getProducts().subscribe({
      next: (prods) => this.products.set(prods || []),
      error: () => {},
    });

    this.orderService.getOrders().subscribe({
      next: (orders) => {
        // Sort latest orders first
        const sorted = [...(orders || [])].reverse();
        this.orders.set(sorted);
        this.isLoading.set(false);
      },
      error: () => {
        this.showError('Failed to load orders from API');
        this.isLoading.set(false);
      },
    });
  }

  getUserName(userId: number): string {
    const u = this.users().find((x) => x.id === userId);
    return u ? u.name : `Customer #${userId}`;
  }

  getUserEmail(userId: number): string {
    const u = this.users().find((x) => x.id === userId);
    return u ? u.email : '';
  }

  getProductName(productId: number): string {
    const p = this.products().find((x) => x.id === productId);
    return p ? p.name : `Product #${productId}`;
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  openDetailsModal(order: AdminOrder): void {
    this.selectedOrder.set(order);
    this.selectedStatus = order.status || 'Pending';
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedOrder.set(null);
  }

  updateOrderStatus(): void {
    const order = this.selectedOrder();
    if (!order) return;

    const current = order.status || 'Pending';
    const next = this.selectedStatus;

    if (current === next) {
      this.closeDetailsModal();
      return;
    }

    if (current === 'Delivered') {
      this.toast.error('Invalid Status Transition', 'Completed orders marked as Delivered cannot be modified.');
      this.showError('Delivered orders cannot be modified.');
      return;
    }

    if (current === 'Cancelled') {
      this.toast.error('Invalid Status Transition', 'Cancelled orders cannot be modified.');
      this.showError('Cancelled orders cannot be modified.');
      return;
    }

    this.isSubmitting.set(true);

    this.orderService.updateOrder(order.id, { status: this.selectedStatus }).subscribe({
      next: () => {
        // Also update local orders list
        this.orders.update((list) =>
          list.map((o) => (o.id === order.id ? { ...o, status: this.selectedStatus } : o))
        );
        this.toast.success('Status Updated', `Order #ORD-${order.id} status updated to "${this.selectedStatus}".`);
        this.showSuccess(`Order #ORD-${order.id} status updated to "${this.selectedStatus}"`);
        this.closeDetailsModal();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to update order status';
        this.toast.error('Update Failed', msg);
        this.showError(msg);
        this.isSubmitting.set(false);
      },
    });
  }

  openDeleteModal(order: AdminOrder): void {
    this.orderToDelete.set(order);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.orderToDelete.set(null);
  }

  confirmDelete(): void {
    const order = this.orderToDelete();
    if (!order) return;

    this.isSubmitting.set(true);
    this.orderService.deleteOrder(order.id).subscribe({
      next: () => {
        this.toast.success('Order Cancelled', `Order #ORD-${order.id} deleted successfully.`);
        this.showSuccess(`Order #ORD-${order.id} deleted successfully`);
        this.closeDeleteModal();
        this.loadData();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to cancel order';
        this.toast.error('Cancel Failed', msg);
        this.showError(msg);
        this.isSubmitting.set(false);
      },
    });
  }

  getStatusBadgeClass(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-success text-white';
      case 'shipped':
        return 'bg-primary text-white';
      case 'confirmed':
        return 'bg-info text-dark';
      case 'cancelled':
        return 'bg-danger text-white';
      default:
        return 'bg-warning text-dark';
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
