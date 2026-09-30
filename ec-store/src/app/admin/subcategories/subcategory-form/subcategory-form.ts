import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminSubCategoryService } from '../../services/subcategory.service';
import { AdminCategory, AdminCategoryService } from '../../services/category.service';
import { ToastService } from '../../../core/services/toast.service';

interface SubcategoryFieldErrors {
  category_id?: string;
  name?: string;
}

@Component({
  selector: 'app-subcategory-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './subcategory-form.html',
  styleUrl: './subcategory-form.css',
})
export class SubcategoryFormComponent implements OnInit {
  private readonly subcategoryService = inject(AdminSubCategoryService);
  private readonly categoryService = inject(AdminCategoryService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEditMode = signal<boolean>(false);
  readonly subId = signal<number | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly categories = signal<AdminCategory[]>([]);

  // Form Fields
  selectedCategoryId: number | null = null;
  subCategoryName = '';
  status: 'active' | 'inactive' = 'active';

  fieldErrors: SubcategoryFieldErrors = {};

  // Alerts
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const editId = idParam ? Number(idParam) : null;

    this.isLoading.set(true);

    forkJoin({
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      sub: editId ? this.subcategoryService.getSubCategory(editId).pipe(catchError(() => of(null))) : of(null),
    }).subscribe({
      next: ({ categories, sub }) => {
        const activeCats = (categories || []).filter((c) => !c.is_deleted);
        this.categories.set(activeCats);

        if (editId && sub) {
          this.isEditMode.set(true);
          this.subId.set(editId);
          this.selectedCategoryId = sub.category_id;
          this.subCategoryName = sub.name;
          this.status = sub.is_deleted ? 'inactive' : 'active';
        } else if (!editId && activeCats.length > 0) {
          this.selectedCategoryId = activeCats[0].id;
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to initialize subcategory form.');
        this.toast.error('Load Error', 'Failed to load categories.');
        this.isLoading.set(false);
      },
    });
  }

  validate(): boolean {
    this.fieldErrors = {};
    let valid = true;

    if (!this.selectedCategoryId) {
      this.fieldErrors.category_id = 'Please select a parent department category.';
      valid = false;
    }

    const name = this.subCategoryName.trim();
    if (!name) {
      this.fieldErrors.name = 'SubCategory name is required.';
      valid = false;
    } else if (name.length < 2 || name.length > 100) {
      this.fieldErrors.name = 'SubCategory name must be between 2 and 100 characters.';
      valid = false;
    }

    return valid;
  }

  onSubmit(): void {
    if (this.isSubmitting()) return;

    if (!this.validate()) {
      this.errorMessage.set('Please fix the highlighted errors before saving.');
      this.toast.error('Validation Error', 'Please check the required fields.');
      return;
    }

    const name = this.subCategoryName.trim();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      category_id: Number(this.selectedCategoryId),
      name,
    };

    if (this.isEditMode() && this.subId()) {
      this.subcategoryService.updateSubCategory(this.subId()!, payload).subscribe({
        next: () => {
          this.toast.success('SubCategory Updated', `SubCategory "${name}" updated successfully.`);
          this.router.navigate(['/admin/subcategories']);
        },
        error: (err) => {
          const msg = err.error?.detail || 'Failed to update subcategory.';
          this.errorMessage.set(msg);
          this.toast.error('Update Failed', msg);
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.subcategoryService.createSubCategory(payload).subscribe({
        next: () => {
          this.toast.success('SubCategory Created', `SubCategory "${name}" created successfully.`);
          this.router.navigate(['/admin/subcategories']);
        },
        error: (err) => {
          const msg = err.error?.detail || 'Failed to create subcategory.';
          this.errorMessage.set(msg);
          this.toast.error('Creation Failed', msg);
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/subcategories']);
  }
}
