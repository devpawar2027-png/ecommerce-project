import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { WishlistService } from '../../core/services/wishlist.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.css',
})
export class WishlistComponent {
  private readonly router = inject(Router);
  readonly wishlistService = inject(WishlistService);
  private readonly cartService = inject(CartService);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);

  readonly wishlistItems = this.wishlistService.wishlistItems;
  readonly wishlistCount = this.wishlistService.wishlistCount;

  removeFromWishlist(id: number): void {
    this.wishlistService.removeFromWishlist(id);
  }

  moveToCart(product: Product): void {
    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({ redirectUrl: '/cart' });
      return;
    }
    this.cartService.addToCart(product);
    this.wishlistService.removeFromWishlist(product.id);
  }

  viewProduct(id: number): void {
    this.router.navigate(['/product-details', id]);
  }
}
