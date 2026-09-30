import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AdminAuthService } from '../services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface AdminLoginFieldErrors {
  email?: string;
  password?: string;
}

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AdminAuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  fieldErrors: AdminLoginFieldErrors = {};

  private returnUrl = '/admin/dashboard';

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    }
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/dashboard';
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  fillDemoCredentials(): void {
    this.email = 'admin@devstore.com';
    this.password = 'admin123';
    this.fieldErrors = {};
  }

  validate(): boolean {
    this.fieldErrors = {};
    let valid = true;

    const trimmedEmail = this.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      this.fieldErrors.email = 'Admin email is required.';
      valid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      this.fieldErrors.email = 'Please enter a valid administrator email address.';
      valid = false;
    }

    if (!this.password) {
      this.fieldErrors.password = 'Password is required.';
      valid = false;
    }

    return valid;
  }

  onSubmit(): void {
    if (this.isLoading()) return;

    if (!this.validate()) {
      this.errorMessage.set('Please provide valid administrator credentials.');
      this.toast.error('Validation Error', 'Please check your email and password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email.trim().toLowerCase(), password: this.password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Admin Authenticated', 'Welcome to the Control Panel.');
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.detail || err.error?.message || 'Invalid administrator email or password.';
        this.errorMessage.set(msg);
        this.toast.error('Login Failed', msg);
      },
    });
  }
}
