import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminBrandService } from '../../services/brand.service';
import { AdminSubCategory, AdminSubCategoryService } from '../../services/subcategory.service';
import { ToastService } from '../../../core/services/toast.service';

interface BrandFieldErrors {
  subcategory_id?: string;
  name?: string;
}

@Component({
  selector: 'app-brand-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './brand-form.html',
  styleUrl: './brand-form.css',
})
export class BrandFormComponent implements OnInit {
  private readonly brandService = inject(AdminBrandService);
  private readonly subcategoryService = inject(AdminSubCategoryService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEditMode = signal<boolean>(false);
  readonly brandId = signal<number | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly subcategories = signal<AdminSubCategory[]>([]);

  // Form Fields
  selectedSubcategoryId: number | null = null;
  brandName = '';
  status: 'active' | 'inactive' = 'active';

  fieldErrors: BrandFieldErrors = {};

  // Alerts
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const editId = idParam ? Number(idParam) : null;

    this.isLoading.set(true);

    forkJoin({
      subs: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
      brand: editId ? this.brandService.getBrand(editId).pipe(catchError(() => of(null))) : of(null),
    }).subscribe({
      next: ({ subs, brand }) => {
        const activeSubs = (subs || []).filter((s) => !s.is_deleted);
        this.subcategories.set(activeSubs);

        if (editId && brand) {
          this.isEditMode.set(true);
          this.brandId.set(editId);
          this.selectedSubcategoryId = brand.subcategory_id;
          this.brandName = brand.name;
          this.status = brand.is_deleted ? 'inactive' : 'active';
        } else if (!editId && activeSubs.length > 0) {
          this.selectedSubcategoryId = activeSubs[0].id;
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to initialize brand form.');
        this.toast.error('Error', 'Failed to load brand data.');
        this.isLoading.set(false);
      },
    });
  }

  validate(): boolean {
    this.fieldErrors = {};
    let valid = true;

    if (!this.selectedSubcategoryId) {
      this.fieldErrors.subcategory_id = 'Please select a parent subcategory.';
      valid = false;
    }

    const name = this.brandName.trim();
    if (!name) {
      this.fieldErrors.name = 'Brand name is required.';
      valid = false;
    } else if (name.length < 2 || name.length > 100) {
      this.fieldErrors.name = 'Brand name must be between 2 and 100 characters.';
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

    const name = this.brandName.trim();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      subcategory_id: Number(this.selectedSubcategoryId),
      name,
    };

    if (this.isEditMode() && this.brandId()) {
      this.brandService.updateBrand(this.brandId()!, payload).subscribe({
        next: () => {
          this.toast.success('Brand Updated', `Brand "${name}" updated successfully.`);
          this.router.navigate(['/admin/brands']);
        },
        error: (err) => {
          const msg = err.error?.detail || 'Failed to update brand.';
          this.errorMessage.set(msg);
          this.toast.error('Update Failed', msg);
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.brandService.createBrand(payload).subscribe({
        next: () => {
          this.toast.success('Brand Created', `Brand "${name}" registered successfully.`);
          this.router.navigate(['/admin/brands']);
        },
        error: (err) => {
          const msg = err.error?.detail || 'Failed to register brand.';
          this.errorMessage.set(msg);
          this.toast.error('Registration Failed', msg);
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/brands']);
  }
}
