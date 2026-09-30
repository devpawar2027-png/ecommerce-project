import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminCategory, AdminCategoryService } from '../services/category.service';
import { AdminSubCategory, AdminSubCategoryService } from '../services/subcategory.service';
import { ToastService } from '../../core/services/toast.service';

export interface CategoryWithCount extends AdminCategory {
  subcategoriesCount: number;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class CategoriesComponent implements OnInit {
  private readonly categoryService = inject(AdminCategoryService);
  private readonly subcategoryService = inject(AdminSubCategoryService);
  private readonly toast = inject(ToastService);

  readonly categories = signal<AdminCategory[]>([]);
  readonly subcategories = signal<AdminSubCategory[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly isSubmitting = signal<boolean>(false);

  // Search & Filter
  readonly searchQuery = signal<string>('');

  // Pagination
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);

  // Delete Selection
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly categoryToDelete = signal<AdminCategory | null>(null);

  // Toast Alerts
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly categoriesWithCount = computed<CategoryWithCount[]>(() => {
    const subs = this.subcategories();
    return this.categories()
      .filter((c) => !c.is_deleted)
      .map((c) => ({
        ...c,
        subcategoriesCount: subs.filter((s) => s.category_id === c.id && !s.is_deleted).length,
      }));
  });

  readonly filteredCategories = computed<CategoryWithCount[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.categoriesWithCount();

    return this.categoriesWithCount().filter(
      (c) => c.name.toLowerCase().includes(q) || String(c.id).includes(q)
    );
  });

  readonly totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredCategories().length / this.pageSize()));
  });

  readonly paginatedCategories = computed<CategoryWithCount[]>(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return this.filteredCategories().slice(start, start + size);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      subcategories: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ categories, subcategories }) => {
        this.categories.set(categories || []);
        this.subcategories.set(subcategories || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.showError('Failed to load categories');
        this.isLoading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  openDeleteModal(category: AdminCategory): void {
    const subs = this.subcategories().filter((s) => s.category_id === category.id && !s.is_deleted);
    if (subs.length > 0) {
      this.toast.error(
        'Cannot Delete Category',
        `Category "${category.name}" has ${subs.length} active subcategories. Delete or reassign them first.`
      );
      return;
    }
    this.categoryToDelete.set(category);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.categoryToDelete.set(null);
  }

  confirmDelete(): void {
    const cat = this.categoryToDelete();
    if (!cat) return;

    this.isSubmitting.set(true);

    this.categoryService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.toast.success('Category Removed', `Category "${cat.name}" removed successfully.`);
        this.showSuccess(`Category "${cat.name}" removed successfully.`);
        this.closeDeleteModal();
        this.loadData();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to delete category.';
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
