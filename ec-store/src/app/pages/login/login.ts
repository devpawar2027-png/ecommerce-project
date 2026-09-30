import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface LoginFieldErrors {
  email?: string;
  password?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';

  fieldErrors: LoginFieldErrors = {};
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  returnUrl = '';

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
  }

  validate(): boolean {
    this.fieldErrors = {};
    let valid = true;

    const trimmedEmail = this.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      this.fieldErrors.email = 'Email address is required.';
      valid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      this.fieldErrors.email = 'Please enter a valid email address.';
      valid = false;
    }

    if (!this.password) {
      this.fieldErrors.password = 'Password is required.';
      valid = false;
    }

    return valid;
  }

  async onLogin(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validate()) {
      this.errorMessage = 'Please provide valid credentials.';
      this.toast.error('Validation Failed', 'Please enter your email and password.');
      return;
    }

    this.isLoading = true;

    try {
      const res = await this.authService.login({
        email: this.email.trim().toLowerCase(),
        password: this.password,
      });

      if (res.success) {
        this.successMessage = 'Login successful! Redirecting...';
        this.toast.success('Welcome back!', 'Login successful.');

        setTimeout(() => {
          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.router.navigate(['/']);
          }
        }, 500);
      } else {
        this.errorMessage = res.message;
        this.toast.error('Login Failed', res.message);
      }
    } catch (error: any) {
      const detail = error?.error?.detail || 'Unable to connect to server. Please try again.';
      this.errorMessage = detail;
      this.toast.error('Connection Error', detail);
    } finally {
      this.isLoading = false;
    }
  }
}