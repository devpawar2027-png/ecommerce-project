import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface OpenModalOptions {
  title?: string;
  message?: string;
  redirectUrl?: string;
  onAuthenticated?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class AuthModalService {
  private readonly defaultTitle = 'Login Required';
  private readonly defaultMessage =
    'Please login to continue shopping and access your cart, wishlist, orders and account.';

  readonly isOpen = signal<boolean>(false);
  readonly modalTitle = signal<string>(this.defaultTitle);
  readonly modalMessage = signal<string>(this.defaultMessage);
  readonly redirectUrl = signal<string | null>(null);
  readonly actionCallback = signal<(() => void) | null>(null);

  constructor(private readonly router: Router) {}

  openModal(options?: OpenModalOptions): void {
    this.modalTitle.set(options?.title || this.defaultTitle);
    this.modalMessage.set(options?.message || this.defaultMessage);
    this.redirectUrl.set(options?.redirectUrl || null);
    this.actionCallback.set(options?.onAuthenticated || null);
    this.isOpen.set(true);
  }

  closeModal(): void {
    this.isOpen.set(false);
  }

  goToLogin(): void {
    const returnUrl = this.redirectUrl();
    this.closeModal();
    if (returnUrl) {
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/login']);
    }
  }

  goToRegister(): void {
    const returnUrl = this.redirectUrl();
    this.closeModal();
    if (returnUrl) {
      this.router.navigate(['/register'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/register']);
    }
  }

  onAuthenticated(): void {
    const callback = this.actionCallback();
    const returnUrl = this.redirectUrl();

    this.closeModal();

    if (callback) {
      try {
        callback();
      } catch (err) {
        console.error('Error executing authenticated callback:', err);
      }
      this.actionCallback.set(null);
    }

    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
      this.redirectUrl.set(null);
    }
  }
}
