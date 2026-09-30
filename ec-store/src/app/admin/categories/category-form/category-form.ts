import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AdminCategoryService } from '../../services/category.service';
import { ToastService } from '../../../core/services/toast.service';

interface CategoryFieldErrors {
  name?: string;
}

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryFormComponent implements OnInit {
  private readonly categoryService = inject(AdminCategoryService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEditMode = signal<boolean>(false);
  readonly categoryId = signal<number | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  // Form Fields
  categoryName = '';
  description = '';
  status: 'active' | 'inactive' = 'active';

  fieldErrors: CategoryFieldErrors = {};

  // Alerts
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id) && id > 0) {
        this.isEditMode.set(true);
        this.categoryId.set(id);
        this.loadCategory(id);
      }
    }
  }

  loadCategory(id: number): void {
    this.isLoading.set(true);
    this.categoryService.getCategory(id).subscribe({
      next: (cat) => {
        if (cat) {
          this.categoryName = cat.name;
          this.status = cat.is_deleted ? 'inactive' : 'active';
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to load category data';
        this.errorMessage.set(msg);
        this.toast.error('Error', msg);
        this.isLoading.set(false);
      },
    });
  }

  validate(): boolean {
    this.fieldErrors = {};
    const name = this.categoryName.trim();
    if (!name) {
      this.fieldErrors.name = 'Category name is required.';
      return false;
    }
    if (name.length < 2 || name.length > 100) {
      this.fieldErrors.name = 'Category name must be between 2 and 100 characters.';
      return false;
    }
    return true;
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;

    if (!this.validate()) {
      this.errorMessage.set('Please fix the highlighted error.');
      this.toast.error('Validation Error', this.fieldErrors.name || 'Invalid form input.');
      return;
    }

    const name = this.categoryName.trim();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    if (this.isEditMode() && this.categoryId()) {
      this.categoryService.updateCategory(this.categoryId()!, { name }).subscribe({
        next: () => {
          this.toast.success('Category Updated', `Category "${name}" has been updated.`);
          this.router.navigate(['/admin/categories']);
        },
        error: (err) => {
          const msg = err.error?.detail || 'Failed to update category.';
          this.errorMessage.set(msg);
          this.toast.error('Update Failed', msg);
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.categoryService.createCategory({ name }).subscribe({
        next: () => {
          this.toast.success('Category Created', `Category "${name}" created successfully.`);
          this.router.navigate(['/admin/categories']);
        },
        error: (err) => {
          const msg = err.error?.detail || 'Failed to create category.';
          this.errorMessage.set(msg);
          this.toast.error('Creation Failed', msg);
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/categories']);
  }
}
