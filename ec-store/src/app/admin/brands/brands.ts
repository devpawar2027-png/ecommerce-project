import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminBrand, AdminBrandService } from '../services/brand.service';
import { AdminSubCategory, AdminSubCategoryService } from '../services/subcategory.service';
import { AdminProduct, AdminProductService } from '../services/product.service';
import { ToastService } from '../../core/services/toast.service';

export interface BrandWithSubcategory extends AdminBrand {
  associatedSubcategoryName: string;
}

@Component({
  selector: 'app-admin-brands',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './brands.html',
  styleUrl: './brands.css',
})
export class BrandsComponent implements OnInit {
  private readonly brandService = inject(AdminBrandService);
  private readonly subcategoryService = inject(AdminSubCategoryService);
  private readonly productService = inject(AdminProductService);
  private readonly toast = inject(ToastService);

  readonly rawBrands = signal<AdminBrand[]>([]);
  readonly subcategories = signal<AdminSubCategory[]>([]);
  readonly products = signal<AdminProduct[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly selectedSubcategoryFilter = signal<number | 'all'>('all');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);

  // Delete Selection
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly brandToDelete = signal<AdminBrand | null>(null);

  // Alerts
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly activeSubcategories = computed(() =>
    this.subcategories().filter((s) => !s.is_deleted)
  );

  readonly brands = computed<BrandWithSubcategory[]>(() => {
    const subs = this.subcategories();
    return this.rawBrands()
      .filter((b) => !b.is_deleted)
      .map((b) => {
        const sub = subs.find((s) => s.id === b.subcategory_id);
        return {
          ...b,
          associatedSubcategoryName: sub ? sub.name : 'Unassigned',
        };
      });
  });

  readonly filteredBrands = computed<BrandWithSubcategory[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const subFilter = this.selectedSubcategoryFilter();

    let list = this.brands();

    if (subFilter !== 'all') {
      list = list.filter((b) => b.subcategory_id === Number(subFilter));
    }

    if (q) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.associatedSubcategoryName.toLowerCase().includes(q) ||
          String(b.id).includes(q)
      );
    }

    return list;
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredBrands().length / this.pageSize()));
  });

  readonly paginatedBrands = computed<BrandWithSubcategory[]>(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredBrands().slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      brands: this.brandService.getBrands().pipe(catchError(() => of([]))),
      subcategories: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
      products: this.productService.getProducts().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ brands, subcategories, products }) => {
        this.rawBrands.set(brands || []);
        this.subcategories.set(subcategories || []);
        this.products.set(products || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showError('Failed to load brands');
        this.toast.error('Error', 'Failed to load brands catalog.');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  setSubcategoryFilter(val: number | 'all'): void {
    this.selectedSubcategoryFilter.set(val);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  openDeleteModal(brand: AdminBrand): void {
    const linkedProds = this.products().filter((p) => p.brand_id === brand.id && !p.is_deleted);
    if (linkedProds.length > 0) {
      this.toast.error(
        'Cannot Delete Brand',
        `Brand "${brand.name}" has ${linkedProds.length} active products linked. Delete or reassign products first.`
      );
      return;
    }

    this.brandToDelete.set(brand);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.brandToDelete.set(null);
  }

  confirmDelete(): void {
    const brand = this.brandToDelete();
    if (!brand) return;

    this.isSubmitting.set(true);

    this.brandService.deleteBrand(brand.id).subscribe({
      next: () => {
        this.toast.success('Brand Removed', `Brand "${brand.name}" removed successfully.`);
        this.showSuccess(`Brand "${brand.name}" removed successfully.`);
        this.closeDeleteModal();
        this.loadData();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to delete brand.';
        this.toast.error('Delete Failed', msg);
        this.showError(msg);
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
