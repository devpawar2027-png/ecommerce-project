import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { onImageError, PLACEHOLDER_IMAGE } from '../../core/utils/image-fallback';

interface CheckoutFieldErrors {
  name?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  pincode?: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
})
export class CheckoutComponent implements OnInit {
  private readonly router = inject(Router);
  readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly cartItems = this.cartService.cartItems;
  readonly cartTotal = this.cartService.cartTotal;
  readonly cartMRP = this.cartService.cartMRP;
  readonly cartSavings = this.cartService.cartSavings;
  readonly cartCount = this.cartService.cartCount;

  name = '';
  mobile = '';
  email = '';
  address = '';
  city = '';
  state = 'Maharashtra';
  pincode = '';
  paymentMethod = 'cod';

  fieldErrors: CheckoutFieldErrors = {};
  errorMessage = '';
  isProcessing = false;

  readonly states = [
    'Andhra Pradesh',
    'Delhi',
    'Gujarat',
    'Karnataka',
    'Kerala',
    'Maharashtra',
    'Punjab',
    'Rajasthan',
    'Tamil Nadu',
    'Telangana',
    'Uttar Pradesh',
    'West Bengal',
  ];

  handleImgError(event: Event): void {
    onImageError(event, PLACEHOLDER_IMAGE);
  }

  ngOnInit(): void {
    if (this.cartItems().length === 0) {
      this.toast.warning('Empty Cart', 'Your cart is empty. Please add items before checkout.');
      this.router.navigate(['/cart']);
      return;
    }

    const user = this.authService.currentUser();
    if (user) {
      this.name = user.name || '';
      this.email = user.email || '';
      if (user.mobile) this.mobile = user.mobile;
      if (user.address) this.address = user.address;
    }
  }

  validate(): boolean {
    this.fieldErrors = {};
    let valid = true;

    // Name Validation
    const trimmedName = this.name.trim();
    if (!trimmedName) {
      this.fieldErrors.name = 'Full name is required.';
      valid = false;
    } else if (trimmedName.length < 3 || trimmedName.length > 50) {
      this.fieldErrors.name = 'Name must be between 3 and 50 characters.';
      valid = false;
    } else if (!/^[A-Za-z\s'\-]+$/.test(trimmedName)) {
      this.fieldErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes.';
      valid = false;
    }

    // Mobile Validation
    const cleanMobile = this.mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      this.fieldErrors.mobile = 'Mobile number is required.';
      valid = false;
    } else if (cleanMobile.length !== 10) {
      this.fieldErrors.mobile = 'Mobile number must be exactly 10 digits.';
      valid = false;
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      this.fieldErrors.mobile = 'Mobile number must start with 6-9.';
      valid = false;
    }

    // Email Validation
    const trimmedEmail = this.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      this.fieldErrors.email = 'Email address is required.';
      valid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      this.fieldErrors.email = 'Please enter a valid email address.';
      valid = false;
    }

    // Address Validation
    const trimmedAddress = this.address.trim();
    if (!trimmedAddress) {
      this.fieldErrors.address = 'Street address is required.';
      valid = false;
    } else if (trimmedAddress.length < 5) {
      this.fieldErrors.address = 'Address must be at least 5 characters long.';
      valid = false;
    }

    // City Validation
    const trimmedCity = this.city.trim();
    if (!trimmedCity) {
      this.fieldErrors.city = 'City name is required.';
      valid = false;
    } else if (trimmedCity.length < 2) {
      this.fieldErrors.city = 'City must be at least 2 characters.';
      valid = false;
    }

    // Pincode Validation
    const cleanPincode = this.pincode.replace(/\D/g, '');
    if (!cleanPincode) {
      this.fieldErrors.pincode = 'Pincode is required.';
      valid = false;
    } else if (cleanPincode.length !== 6) {
      this.fieldErrors.pincode = 'Pincode must be exactly 6 digits.';
      valid = false;
    }

    return valid;
  }

  onPlaceOrder(): void {
    if (this.isProcessing) return;

    this.errorMessage = '';

    if (this.cartItems().length === 0) {
      this.errorMessage = 'Your cart is empty. Please add items before placing an order.';
      this.toast.error('Cart Empty', this.errorMessage);
      this.router.navigate(['/cart']);
      return;
    }

    if (!this.validate()) {
      this.errorMessage = 'Please fix the highlighted shipping information errors.';
      this.toast.error('Validation Error', 'Please check your delivery details.');
      return;
    }

    this.isProcessing = true;

    const customer = {
      name: this.name.trim(),
      mobile: this.mobile.replace(/\D/g, ''),
      email: this.email.trim().toLowerCase(),
      address: this.address.trim(),
      city: this.city.trim(),
      state: this.state,
      pincode: this.pincode.replace(/\D/g, ''),
      paymentMethod: this.paymentMethod,
    };

    this.orderService.placeOrder(customer, this.cartItems(), this.cartTotal()).subscribe({
      next: () => {
        this.cartService.clearCart();
        this.isProcessing = false;
        this.toast.success('Order Placed!', 'Your order has been placed successfully.');
        this.router.navigate(['/order-success']);
      },
      error: (err) => {
        this.isProcessing = false;
        const detail = err?.error?.detail || err?.message || 'Failed to process order. Please try again.';
        this.errorMessage = detail;
        this.toast.error('Order Failed', detail);
      },
    });
  }
}
