import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminCategoryService } from '../services/category.service';
import { AdminSubCategoryService } from '../services/subcategory.service';
import { AdminBrandService } from '../services/brand.service';
import { AdminProductService } from '../services/product.service';
import { AdminOrder, AdminOrderService } from '../services/order.service';
import { AdminUserService } from '../services/user.service';

export interface DashboardStats {
  categories: number;
  subcategories: number;
  brands: number;
  products: number;
  orders: number;
  users: number;
  wishlist: number;
  revenue: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly categoryService = inject(AdminCategoryService);
  private readonly subcategoryService = inject(AdminSubCategoryService);
  private readonly brandService = inject(AdminBrandService);
  private readonly productService = inject(AdminProductService);
  private readonly orderService = inject(AdminOrderService);
  private readonly userService = inject(AdminUserService);

  readonly isLoading = signal<boolean>(true);
  readonly stats = signal<DashboardStats>({
    categories: 0,
    subcategories: 0,
    brands: 0,
    products: 0,
    orders: 0,
    users: 0,
    wishlist: 0,
    revenue: 0,
  });

  readonly recentOrders = signal<AdminOrder[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);

    forkJoin({
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      subcategories: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
      brands: this.brandService.getBrands().pipe(catchError(() => of([]))),
      products: this.productService.getProducts().pipe(catchError(() => of([]))),
      orders: this.orderService.getOrders().pipe(catchError(() => of([]))),
      users: this.userService.getUsers().pipe(catchError(() => of([]))),
      wishlist: this.http.get<any[]>('http://127.0.0.1:8000/wishlist').pipe(catchError(() => of([]))),
    }).subscribe({
      next: (res) => {
        const activeCategories = (res.categories || []).filter((c) => !c.is_deleted);
        const activeSubcategories = (res.subcategories || []).filter((s) => !s.is_deleted);
        const activeBrands = (res.brands || []).filter((b) => !b.is_deleted);
        const activeProducts = (res.products || []).filter((p) => !p.is_deleted);
        const activeOrders = (res.orders || []).filter((o) => !o.is_deleted);
        const activeUsers = (res.users || []).filter((u) => !u.is_deleted);
        const activeWishlist = (res.wishlist || []).filter((w) => !w.is_deleted);

        const totalRevenue = activeOrders.reduce(
          (sum, ord) => sum + (Number(ord.total_price) || 0),
          0
        );

        this.stats.set({
          categories: activeCategories.length,
          subcategories: activeSubcategories.length,
          brands: activeBrands.length,
          products: activeProducts.length,
          orders: activeOrders.length,
          users: activeUsers.length,
          wishlist: activeWishlist.length,
          revenue: totalRevenue,
        });

        const sortedOrders = [...activeOrders].reverse().slice(0, 7);
        this.recentOrders.set(sortedOrders);

        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  getStatusBadgeClass(status?: string): string {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'badge-delivered';
      case 'shipped':
        return 'badge-shipped';
      case 'confirmed':
        return 'badge-confirmed';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-pending';
    }
  }
}
