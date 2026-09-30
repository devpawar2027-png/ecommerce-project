import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.css',
})
export class AuthModalComponent {
  readonly modalService = inject(AuthModalService);
  private readonly authService = inject(AuthService);

  readonly isOpen = this.modalService.isOpen;
  readonly title = this.modalService.modalTitle;
  readonly message = this.modalService.modalMessage;

  // Inline Quick Login state for users who prefer instant authentication without leaving the page
  readonly showQuickLogin = signal<boolean>(false);
  quickEmail = '';
  quickPassword = '';
  quickLoading = false;
  quickError = '';
  quickSuccess = '';

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  close(): void {
    this.quickError = '';
    this.quickSuccess = '';
    this.showQuickLogin.set(false);
    this.modalService.closeModal();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('auth-modal-overlay')) {
      this.close();
    }
  }

  handleLoginClick(): void {
    this.modalService.goToLogin();
  }

  handleRegisterClick(): void {
    this.modalService.goToRegister();
  }

  toggleQuickLogin(): void {
    this.quickError = '';
    this.quickSuccess = '';
    this.showQuickLogin.update((val) => !val);
  }

  async submitQuickLogin(): Promise<void> {
    this.quickError = '';
    this.quickSuccess = '';

    if (!this.quickEmail.trim() || !this.quickPassword.trim()) {
      this.quickError = 'Please enter your email and password.';
      return;
    }

    this.quickLoading = true;

    try {
      const res = await this.authService.login({
        email: this.quickEmail.trim(),
        password: this.quickPassword,
      });

      if (res.success) {
        this.quickSuccess = 'Logged in successfully!';
        setTimeout(() => {
          this.quickEmail = '';
          this.quickPassword = '';
          this.quickLoading = false;
          this.modalService.onAuthenticated();
        }, 600);
      } else {
        this.quickError = res.message || 'Invalid email or password.';
        this.quickLoading = false;
      }
    } catch {
      this.quickError = 'Unable to connect to the authentication service.';
      this.quickLoading = false;
    }
  }
}
