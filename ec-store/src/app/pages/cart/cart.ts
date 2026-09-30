import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ToastService } from '../../core/services/toast.service';
import { onImageError, PLACEHOLDER_IMAGE } from '../../core/utils/image-fallback';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CartComponent {
  private readonly router = inject(Router);
  readonly cartService = inject(CartService);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);
  private readonly toast = inject(ToastService);

  readonly cartItems = this.cartService.cartItems;
  readonly cartCount = this.cartService.cartCount;
  readonly cartTotal = this.cartService.cartTotal;
  readonly cartMRP = this.cartService.cartMRP;
  readonly cartSavings = this.cartService.cartSavings;

  handleImgError(event: Event): void {
    onImageError(event, PLACEHOLDER_IMAGE);
  }

  getItemMaxStock(item: any): number {
    return item.product.quantity || item.product.stockCount || 10;
  }

  increaseQty(id: number): void {
    const item = this.cartItems().find((i) => i.product.id === id);
    if (item) {
      const max = this.getItemMaxStock(item);
      if (item.quantity >= max) {
        this.toast.warning('Max Quantity', `Cannot add more. Only ${max} units available in stock.`);
        return;
      }
    }
    this.cartService.increaseQuantity(id);
  }

  decreaseQty(id: number): void {
    this.cartService.decreaseQuantity(id);
  }

  removeItem(id: number): void {
    const item = this.cartItems().find((i) => i.product.id === id);
    this.cartService.removeFromCart(id);
    if (item) {
      this.toast.info('Item Removed', `"${item.product.name}" removed from your cart.`);
    }
  }

  clearAll(): void {
    this.cartService.clearCart();
    this.toast.info('Cart Cleared', 'All items have been removed from your cart.');
  }

  proceedToCheckout(): void {
    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({ redirectUrl: '/checkout' });
      return;
    }
    if (this.cartItems().length === 0) {
      this.toast.warning('Cart Empty', 'Please add items to your cart before proceeding to checkout.');
      return;
    }
    this.router.navigate(['/checkout']);
  }
}
