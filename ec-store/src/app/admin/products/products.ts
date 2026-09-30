import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminProduct, AdminProductService } from '../services/product.service';
import { AdminBrand, AdminBrandService } from '../services/brand.service';

export interface ProductWithBrand extends AdminProduct {
  brandName: string;
  stockStatus: 'in' | 'low' | 'out';
  stockLabel: string;
}

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit {
  private readonly productService = inject(AdminProductService);
  private readonly brandService = inject(AdminBrandService);

  readonly products = signal<AdminProduct[]>([]);
  readonly brands = signal<AdminBrand[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly selectedBrandFilter = signal<number | 'all'>('all');
  readonly stockFilter = signal<'all' | 'in' | 'low' | 'out'>('all');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);

  // Delete Selection
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly productToDelete = signal<AdminProduct | null>(null);

  // Alerts
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly activeBrands = computed(() =>
    this.brands().filter((b) => !b.is_deleted)
  );

  readonly productsWithBrand = computed<ProductWithBrand[]>(() => {
    const brandList = this.brands();
    return this.products()
      .filter((p) => !p.is_deleted)
      .map((p) => {
        const brand = brandList.find((b) => b.id === p.brand_id);
        const brandName = brand ? brand.name : `Brand #${p.brand_id}`;

        let stockStatus: 'in' | 'low' | 'out' = 'in';
        let stockLabel = `${p.quantity} In Stock`;

        if (p.quantity <= 0) {
          stockStatus = 'out';
          stockLabel = 'Out of Stock';
        } else if (p.quantity <= 5) {
          stockStatus = 'low';
          stockLabel = `Only ${p.quantity} Left!`;
        }

        return {
          ...p,
          brandName,
          stockStatus,
          stockLabel,
        };
      });
  });

  readonly filteredProducts = computed<ProductWithBrand[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const brandFilter = this.selectedBrandFilter();
    const stock = this.stockFilter();

    let list = this.productsWithBrand();

    if (brandFilter !== 'all') {
      list = list.filter((p) => p.brand_id === Number(brandFilter));
    }

    if (stock === 'in') {
      list = list.filter((p) => p.stockStatus === 'in');
    } else if (stock === 'low') {
      list = list.filter((p) => p.stockStatus === 'low');
    } else if (stock === 'out') {
      list = list.filter((p) => p.stockStatus === 'out');
    }

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.details && p.details.toLowerCase().includes(q)) ||
          String(p.id).includes(q) ||
          p.brandName.toLowerCase().includes(q)
      );
    }

    return list;
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize()));
  });

  readonly paginatedProducts = computed<ProductWithBrand[]>(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredProducts().slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      brands: this.brandService.getBrands().pipe(catchError(() => of([]))),
      products: this.productService.getProducts().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ brands, products }) => {
        this.brands.set(brands || []);
        this.products.set(products || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showError('Failed to load products');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  setBrandFilter(value: string): void {
    this.selectedBrandFilter.set(value === 'all' ? 'all' : Number(value));
    this.currentPage.set(1);
  }

  setStockFilter(value: 'all' | 'in' | 'low' | 'out'): void {
    this.stockFilter.set(value);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  openDeleteModal(product: AdminProduct): void {
    this.productToDelete.set(product);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const prod = this.productToDelete();
    if (!prod) return;

    this.isSubmitting.set(true);

    this.productService.deleteProduct(prod.id).subscribe({
      next: () => {
        this.showSuccess(`Product "${prod.name}" removed successfully.`);
        this.closeDeleteModal();
        this.loadData();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.showError(err.error?.detail || 'Failed to delete product.');
        this.isSubmitting.set(false);
      },
    });
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
