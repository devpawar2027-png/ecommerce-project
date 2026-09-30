import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ToastService } from '../../core/services/toast.service';
import { Product } from '../../core/models/product.model';
import { onImageError, PLACEHOLDER_IMAGE } from '../../core/utils/image-fallback';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);

  readonly product = signal<Product | undefined>(undefined);
  readonly selectedImage = signal<string>('');
  readonly quantity = signal<number>(1);
  readonly addedNotification = signal<string | null>(null);
  readonly isLoading = signal<boolean>(true);

  handleImgError(event: Event): void {
    onImageError(event, PLACEHOLDER_IMAGE);
  }

  readonly isWished = computed(() => {
    const p = this.product();
    return p ? this.wishlistService.isInWishlist(p.id) : false;
  });

  readonly discountPercentage = computed(() => {
    const p = this.product();
    if (!p || !p.oldPrice || p.oldPrice <= p.price) return 0;
    return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
  });

  readonly stars = computed(() => {
    const rating = this.product()?.rating ?? 4.8;
    const rounded = Math.round(rating);
    return [1, 2, 3, 4, 5].map((n) => n <= rounded);
  });

  readonly specEntries = computed(() => {
    const specs = this.product()?.specifications;
    if (!specs) return [];
    return Object.entries(specs).map(([key, value]) => ({ key, value }));
  });

  readonly availableStock = computed<number>(() => {
    const p = this.product();
    if (!p) return 0;
    return typeof p.stockCount === 'number' ? p.stockCount : (p.quantity || 0);
  });

  readonly isOutOfStock = computed<boolean>(() => {
    return this.availableStock() <= 0;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : NaN;
      if (!isNaN(id)) {
        this.isLoading.set(true);
        this.productService.getProductById(id).subscribe({
          next: (found) => {
            this.product.set(found);
            if (found) {
              this.selectedImage.set(found.image || '');
              this.quantity.set(1);
            }
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Error loading product details from API:', err);
            this.product.set(undefined);
            this.isLoading.set(false);
          },
        });
      } else {
        this.product.set(undefined);
        this.isLoading.set(false);
      }
    });
  }

  selectImage(img: string): void {
    this.selectedImage.set(img);
  }

  increaseQuantity(): void {
    const current = this.quantity();
    const max = this.availableStock();
    if (current < max) {
      this.quantity.set(current + 1);
    } else {
      this.toast.warning('Stock Limit', `Only ${max} items available in stock.`);
    }
  }

  decreaseQuantity(): void {
    const current = this.quantity();
    if (current > 1) {
      this.quantity.set(current - 1);
    }
  }

  toggleWishlist(): void {
    const current = this.product();
    if (!current) return;
    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({
        redirectUrl: `/product-details/${current.id}`,
        onAuthenticated: () => this.toggleWishlist(),
      });
      return;
    }
    const added = this.wishlistService.toggleWishlist(current);
    if (added) {
      this.toast.success('Wishlist', `Added "${current.name}" to wishlist`);
    } else {
      this.toast.info('Wishlist', `Removed "${current.name}" from wishlist`);
    }
  }

  addToCart(): void {
    const p = this.product();
    if (!p) return;

    if (this.isOutOfStock()) {
      this.toast.error('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({
        redirectUrl: `/product-details/${p.id}`,
        onAuthenticated: () => this.addToCart(),
      });
      return;
    }

    this.cartService.addToCart(p, this.quantity());
    const msg = `Added ${this.quantity()} × "${p.name}" to your cart!`;
    this.addedNotification.set(msg);
    this.toast.success('Added to Cart', msg);

    setTimeout(() => {
      this.addedNotification.set(null);
    }, 3000);
  }

  buyNow(): void {
    const p = this.product();
    if (!p) return;

    if (this.isOutOfStock()) {
      this.toast.error('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({
        redirectUrl: '/checkout',
        onAuthenticated: () => this.buyNow(),
      });
      return;
    }

    this.cartService.addToCart(p, this.quantity());
    this.router.navigate(['/checkout']);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
