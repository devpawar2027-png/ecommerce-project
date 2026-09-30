import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { NavbarComponent } from '../../shared/navbar/navbar';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { CategoryService } from '../../core/services/category.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ToastService } from '../../core/services/toast.service';
import { Category } from '../../core/models/category.model';
import { Product } from '../../core/models/product.model';
import { onImageError, PLACEHOLDER_IMAGE } from '../../core/utils/image-fallback';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly categoryService = inject(CategoryService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);

  handleImgError(event: Event): void {
    onImageError(event, PLACEHOLDER_IMAGE);
  }

  readonly wishlistService = inject(WishlistService);

  // Category Signals
  readonly categories = signal<Category[]>([]);
  readonly isCategoriesLoading = signal<boolean>(true);
  readonly categoryError = signal<string | null>(null);

  // Loading skeleton placeholder items (10 skeleton cards = 2 rows of 5 on desktop)
  readonly skeletonPlaceholders = Array.from({ length: 10 }, (_, i) => i);

  // Cart notification signal
  readonly cartNotice = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.isCategoriesLoading.set(true);
    this.categoryError.set(null);

    this.categoryService.getCategories().subscribe({
      next: (data: Category[]) => {
        const activeCategories = (data || []).filter((c) => !c.is_deleted);
        this.categories.set(activeCategories);
        this.isCategoriesLoading.set(false);
      },
      error: (error) => {
        console.error('Category API Error:', error);
        this.categoryError.set('Unable to load categories. Please check your connection and try again.');
        this.isCategoriesLoading.set(false);
      },
    });
  }

  retryCategories(): void {
    this.loadCategories();
  }

  loadProducts(): void {
    this.productService.refreshProducts().subscribe({
      error: (err) => console.error('Product API Error:', err),
    });
  }

  get products(): Product[] {
    return this.productService.getProducts();
  }

  stars(rating?: number): boolean[] {
    const filled = Math.round(rating || 4.8);
    return [1, 2, 3, 4, 5].map((n) => n <= filled);
  }

  getDiscount(product: Product): number {
    if (!product.oldPrice || product.oldPrice <= product.price) {
      return 0;
    }

    return Math.round(
      ((product.oldPrice - product.price) / product.oldPrice) * 100
    );
  }

  isWished(productId: number): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  isProductOutOfStock(product: Product): boolean {
    const stock = typeof product.stockCount === 'number' ? product.stockCount : (product.quantity || 0);
    return stock <= 0;
  }

  toggleWishlist(product: Product, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({
        redirectUrl: '/wishlist',
        onAuthenticated: () => this.toggleWishlist(product),
      });
      return;
    }
    const added = this.wishlistService.toggleWishlist(product);
    if (added) {
      this.toast.success('Wishlist', `Added "${product.name}" to wishlist`);
    } else {
      this.toast.info('Wishlist', `Removed "${product.name}" from wishlist`);
    }
  }

  addToCart(product: Product, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const stock = typeof product.stockCount === 'number' ? product.stockCount : (product.quantity || 0);
    if (stock <= 0) {
      this.toast.error('Out of Stock', `"${product.name}" is currently out of stock.`);
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({
        redirectUrl: '/cart',
        onAuthenticated: () => this.addToCart(product),
      });
      return;
    }

    this.cartService.addToCart(product);
    this.cartNotice.set(`"${product.name}" added to cart!`);
    this.toast.success('Added to Cart', `"${product.name}" added to cart.`);

    setTimeout(() => {
      this.cartNotice.set(null);
    }, 2500);
  }

  goToCategory(category: Category | string): void {
    let slug = '';
    if (typeof category === 'string') {
      slug = this.getSlug(category);
    } else {
      slug = category.slug || this.getSlug(category.name);
    }
    this.router.navigate(['/category', slug]);
  }

  onCategoryKeydown(event: KeyboardEvent, category: Category): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.goToCategory(category);
    }
  }

  goToProduct(id: number): void {
    this.router.navigate(['/product-details', id]);
  }

  private getSlug(name: string): string {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}