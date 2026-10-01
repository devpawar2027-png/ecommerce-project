import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface LoginFieldErrors {
  email?: string;
  password?: string;
  mobile?: string;
  otp?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Active Login Tab: 'password' | 'otp'
  activeTab: 'password' | 'otp' = 'password';

  // Password Login State
  email = '';
  password = '';

  // OTP Login State
  otpStep: 'mobile' | 'otp' = 'mobile';
  mobile = '';
  otp = '';
  devOtpHint = '';
  resendCountdown = 0;
  private countdownTimer: any = null;

  fieldErrors: LoginFieldErrors = {};
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  returnUrl = '';

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'otp') {
      this.switchTab('otp');
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  switchTab(tab: 'password' | 'otp'): void {
    this.activeTab = tab;
    this.fieldErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Password Login Validation
  validatePasswordForm(): boolean {
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

  // OTP Mobile Validation
  validateMobile(): boolean {
    this.fieldErrors.mobile = undefined;
    const cleanMobile = this.mobile.replace(/\D/g, '');

    if (!cleanMobile) {
      this.fieldErrors.mobile = 'Mobile number is required.';
      return false;
    }

    if (cleanMobile.length !== 10) {
      this.fieldErrors.mobile = 'Mobile number must be exactly 10 digits.';
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      this.fieldErrors.mobile = 'Please enter a valid 10-digit mobile number starting with 6-9.';
      return false;
    }

    return true;
  }

  // OTP Code Validation
  validateOtp(): boolean {
    this.fieldErrors.otp = undefined;
    const cleanOtp = this.otp.trim();

    if (!cleanOtp) {
      this.fieldErrors.otp = 'Please enter the 4-digit OTP.';
      return false;
    }

    if (!/^\d{4}$/.test(cleanOtp)) {
      this.fieldErrors.otp = 'OTP must be exactly 4 digits.';
      return false;
    }

    return true;
  }

  // Handle Password-based Login
  async onPasswordLogin(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validatePasswordForm()) {
      this.errorMessage = 'Please provide valid credentials.';
      this.toast.error('Validation Failed', 'Please check your email and password.');
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
        this.redirectAfterLogin();
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

  // Step 1: Send OTP to Mobile
  async onRequestOtp(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateMobile()) {
      return;
    }

    this.isLoading = true;
    const cleanMobile = this.mobile.replace(/\D/g, '');

    try {
      const res = await this.authService.sendOtp(cleanMobile, 'login');

      if (res.success) {
        this.otpStep = 'otp';
        this.devOtpHint = res.dev_otp || cleanMobile.slice(-4);
        this.successMessage = `OTP sent to +91 ${cleanMobile}`;
        this.toast.success('OTP Sent', `4-digit OTP sent to +91 ${cleanMobile}`);
        this.startResendTimer(30);
      } else {
        this.fieldErrors.mobile = res.message;
        this.errorMessage = res.message;
        this.toast.error('Verification Failed', res.message);
      }
    } catch (error: any) {
      const detail = error?.error?.detail || 'Failed to request OTP.';
      this.errorMessage = detail;
      this.toast.error('Error', detail);
    } finally {
      this.isLoading = false;
    }
  }

  // Step 2: Verify OTP and Login
  async onVerifyOtpLogin(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateOtp()) {
      return;
    }

    this.isLoading = true;
    const cleanMobile = this.mobile.replace(/\D/g, '');

    try {
      const res = await this.authService.loginWithOtp({
        mobile: cleanMobile,
        otp: this.otp.trim(),
      });

      if (res.success) {
        this.successMessage = 'Login successful! Redirecting...';
        this.toast.success('Welcome Back!', 'Logged in successfully with OTP.');
        this.redirectAfterLogin();
      } else {
        this.fieldErrors.otp = 'Invalid OTP. Please try again.';
        this.errorMessage = res.message || 'Invalid OTP. Please try again.';
        this.toast.error('Login Failed', 'Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      const detail = error?.error?.detail || 'Invalid OTP. Please try again.';
      this.fieldErrors.otp = detail;
      this.errorMessage = detail;
      this.toast.error('Error', detail);
    } finally {
      this.isLoading = false;
    }
  }

  // Resend OTP
  async onResendOtp(): Promise<void> {
    if (this.resendCountdown > 0 || this.isLoading) {
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    const cleanMobile = this.mobile.replace(/\D/g, '');

    try {
      const res = await this.authService.sendOtp(cleanMobile, 'login');
      if (res.success) {
        this.devOtpHint = res.dev_otp || cleanMobile.slice(-4);
        this.toast.success('OTP Resent', `New OTP sent to +91 ${cleanMobile}`);
        this.startResendTimer(30);
      } else {
        this.errorMessage = res.message;
        this.toast.error('Failed', res.message);
      }
    } catch (error: any) {
      this.toast.error('Error', 'Unable to resend OTP right now.');
    } finally {
      this.isLoading = false;
    }
  }

  // Reset back to Mobile input step
  changeMobile(): void {
    this.clearTimer();
    this.otpStep = 'mobile';
    this.otp = '';
    this.fieldErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
  }

  private startResendTimer(seconds: number): void {
    this.clearTimer();
    this.resendCountdown = seconds;
    this.countdownTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.resendCountdown = 0;
  }

  private redirectAfterLogin(): void {
    setTimeout(() => {
      if (this.returnUrl) {
        this.router.navigateByUrl(this.returnUrl);
      } else {
        this.router.navigate(['/']);
      }
    }, 500);
  }
}