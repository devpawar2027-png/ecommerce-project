import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { AdminProductService, ProductPayload } from '../../services/product.service';
import { AdminBrand, AdminBrandService } from '../../services/brand.service';
import { ToastService } from '../../../core/services/toast.service';

interface ProductFieldErrors {
  name?: string;
  brand_id?: string;
  price?: string;
  quantity?: string;
  details?: string;
  image?: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export class ProductFormComponent implements OnInit {
  private readonly productService = inject(AdminProductService);
  private readonly brandService = inject(AdminBrandService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isEditMode = signal<boolean>(false);
  readonly productId = signal<number | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly brands = signal<AdminBrand[]>([]);

  // Form Fields
  selectedBrandId: number | null = null;
  productName = '';
  price: number | null = null;
  quantity = 10;
  description = '';
  imageUrl = '';
  imagePreview: string | null = null;
  status: 'active' | 'inactive' = 'active';

  fieldErrors: ProductFieldErrors = {};

  // Alerts
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const editId = idParam ? Number(idParam) : null;

    this.isLoading.set(true);

    forkJoin({
      brands: this.brandService.getBrands().pipe(catchError(() => of([]))),
      product: editId ? this.productService.getProduct(editId).pipe(catchError(() => of(null))) : of(null),
    }).subscribe({
      next: ({ brands, product }) => {
        const activeBrands = (brands || []).filter((b) => !b.is_deleted);
        this.brands.set(activeBrands);

        if (editId && product) {
          this.isEditMode.set(true);
          this.productId.set(editId);
          this.selectedBrandId = product.brand_id;
          this.productName = product.name;
          this.price = product.price;
          this.quantity = product.quantity;
          this.description = product.details || '';
          this.imageUrl = product.image_url || '';
          this.imagePreview = product.image_url || null;
          this.status = product.is_deleted ? 'inactive' : 'active';
        } else if (!editId && activeBrands.length > 0) {
          this.selectedBrandId = activeBrands[0].id;
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to initialize product form.');
        this.toast.error('Error', 'Failed to load product initialization data.');
        this.isLoading.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    this.fieldErrors.image = undefined;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.fieldErrors.image = 'Only JPG, PNG, and WEBP formats are supported.';
        this.toast.error('Invalid Image', this.fieldErrors.image);
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.fieldErrors.image = 'Image size must be less than 5MB.';
        this.toast.error('Image Too Large', this.fieldErrors.image);
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.toast.info('Image Attached', 'Preview updated.');
      };
      reader.readAsDataURL(file);
    }
  }

  validate(): boolean {
    this.fieldErrors = {};
    let valid = true;

    const name = this.productName.trim();
    if (!name) {
      this.fieldErrors.name = 'Product title is required.';
      valid = false;
    } else if (name.length < 2 || name.length > 150) {
      this.fieldErrors.name = 'Product title must be between 2 and 150 characters.';
      valid = false;
    }

    if (!this.selectedBrandId) {
      this.fieldErrors.brand_id = 'Please select a brand.';
      valid = false;
    }

    if (this.price === null || this.price === undefined || isNaN(this.price)) {
      this.fieldErrors.price = 'Price is required.';
      valid = false;
    } else if (this.price <= 0) {
      this.fieldErrors.price = 'Price must be greater than 0.';
      valid = false;
    }

    if (this.quantity === null || this.quantity === undefined || isNaN(this.quantity)) {
      this.fieldErrors.quantity = 'Stock quantity is required.';
      valid = false;
    } else if (this.quantity < 0) {
      this.fieldErrors.quantity = 'Quantity cannot be negative.';
      valid = false;
    }

    const desc = this.description.trim();
    if (!desc) {
      this.fieldErrors.details = 'Description is required (minimum 20 characters).';
      valid = false;
    } else if (desc.length < 20) {
      this.fieldErrors.details = `Description must be at least 20 characters (current: ${desc.length}).`;
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

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const name = this.productName.trim();
    const payload: ProductPayload = {
      brand_id: Number(this.selectedBrandId),
      name,
      price: Number(this.price),
      quantity: Number(this.quantity),
      details: this.description.trim(),
      image_url: this.imagePreview || this.imageUrl.trim() || undefined,
    };

    if (this.isEditMode() && this.productId()) {
      this.productService.updateProduct(this.productId()!, payload).subscribe({
        next: () => {
          this.toast.success('Product Updated', `Product "${name}" updated successfully.`);
          this.router.navigate(['/admin/products']);
        },
        error: (err) => {
          const msg = err.error?.detail || 'Failed to update product.';
          this.errorMessage.set(msg);
          this.toast.error('Update Failed', msg);
          this.isSubmitting.set(false);
        },
      });
    } else {
      this.productService.createProduct(payload).subscribe({
        next: () => {
          this.toast.success('Product Added', `Product "${name}" added to catalog.`);
          this.router.navigate(['/admin/products']);
        },
        error: (err) => {
          const msg = err.error?.detail || 'Failed to add product to catalog.';
          this.errorMessage.set(msg);
          this.toast.error('Creation Failed', msg);
          this.isSubmitting.set(false);
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/products']);
  }
}
