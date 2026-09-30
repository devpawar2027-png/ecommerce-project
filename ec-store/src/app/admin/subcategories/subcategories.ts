import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminSubCategory, AdminSubCategoryService } from '../services/subcategory.service';
import { AdminCategory, AdminCategoryService } from '../services/category.service';
import { AdminBrand, AdminBrandService } from '../services/brand.service';
import { ToastService } from '../../core/services/toast.service';

export interface SubCategoryWithParent extends AdminSubCategory {
  parentCategoryName: string;
}

@Component({
  selector: 'app-admin-subcategories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './subcategories.html',
  styleUrl: './subcategories.css',
})
export class SubcategoriesComponent implements OnInit {
  private readonly subcategoryService = inject(AdminSubCategoryService);
  private readonly categoryService = inject(AdminCategoryService);
  private readonly brandService = inject(AdminBrandService);
  private readonly toast = inject(ToastService);

  readonly rawSubcategories = signal<AdminSubCategory[]>([]);
  readonly categories = signal<AdminCategory[]>([]);
  readonly brands = signal<AdminBrand[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  // Filters
  readonly searchQuery = signal<string>('');
  readonly selectedCategoryFilter = signal<number | 'all'>('all');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);

  // Delete Selection
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly subCategoryToDelete = signal<AdminSubCategory | null>(null);

  // Alerts
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly activeCategories = computed(() =>
    this.categories().filter((c) => !c.is_deleted)
  );

  readonly subcategoriesWithParent = computed<SubCategoryWithParent[]>(() => {
    const cats = this.categories();
    return this.rawSubcategories()
      .filter((s) => !s.is_deleted)
      .map((s) => {
        const parent = cats.find((c) => c.id === s.category_id);
        return {
          ...s,
          parentCategoryName: parent ? parent.name : 'Unknown Department',
        };
      });
  });

  readonly filteredSubcategories = computed<SubCategoryWithParent[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const catFilter = this.selectedCategoryFilter();

    let list = this.subcategoriesWithParent();

    if (catFilter !== 'all') {
      list = list.filter((s) => s.category_id === Number(catFilter));
    }

    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.parentCategoryName.toLowerCase().includes(q) ||
          String(s.id).includes(q)
      );
    }

    return list;
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredSubcategories().length / this.pageSize()));
  });

  readonly paginatedSubcategories = computed<SubCategoryWithParent[]>(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredSubcategories().slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      subcategories: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      brands: this.brandService.getBrands().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ subcategories, categories, brands }) => {
        this.rawSubcategories.set(subcategories || []);
        this.categories.set(categories || []);
        this.brands.set(brands || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showError('Failed to load subcategories');
        this.toast.error('Error', 'Failed to load subcategories.');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  setCategoryFilter(val: number | 'all'): void {
    this.selectedCategoryFilter.set(val);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  openDeleteModal(sub: AdminSubCategory): void {
    // Check if active brands exist under this subcategory
    const activeBrands = this.brands().filter((b) => b.subcategory_id === sub.id && !b.is_deleted);
    if (activeBrands.length > 0) {
      this.toast.error(
        'Cannot Delete SubCategory',
        `SubCategory "${sub.name}" has ${activeBrands.length} active brands linked to it. Delete or reassign them first.`
      );
      return;
    }

    this.subCategoryToDelete.set(sub);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.subCategoryToDelete.set(null);
  }

  confirmDelete(): void {
    const sub = this.subCategoryToDelete();
    if (!sub) return;

    this.isSubmitting.set(true);

    this.subcategoryService.deleteSubCategory(sub.id).subscribe({
      next: () => {
        this.toast.success('SubCategory Removed', `SubCategory "${sub.name}" deleted successfully.`);
        this.showSuccess(`SubCategory "${sub.name}" deleted successfully.`);
        this.closeDeleteModal();
        this.loadData();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to delete subcategory.';
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
