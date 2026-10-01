import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, RegisterPayload } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface RegisterFieldErrors {
  name?: string;
  email?: string;
  gender?: string;
  mobile?: string;
  address?: string;
  password?: string;
  confirm_password?: string;
  profile_photo?: string;
  otp?: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Flipkart / Amazon 3-Step Flow:
  // Step 1: Registration Form
  // Step 2: OTP Verification
  // Step 3: Account Created Confirmation
  currentStep: 1 | 2 | 3 = 1;

  // Step 1: Form Fields
  name = '';
  email = '';
  gender = '';
  mobile = '';
  address = '';
  password = '';
  confirm_password = '';
  profile_photo = '';

  showPassword = false;
  showConfirmPassword = false;

  // Step 2: OTP Verification State
  otp = '';
  devOtpHint = '';
  resendCountdown = 0;
  private countdownTimer: any = null;

  // Loading States
  isLoading = false;      // Step 1 submission
  isVerifying = false;    // Step 2 OTP verification spinner

  fieldErrors: RegisterFieldErrors = {};
  errorMessage = '';
  successMessage = '';
  returnUrl = '';

  readonly genderOptions = ['Male', 'Female', 'Other'];

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onPhotoSelected(event: Event): void {
    this.fieldErrors.profile_photo = undefined;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.fieldErrors.profile_photo = 'Only JPG, PNG, and WEBP formats are allowed.';
        this.toast.error('Invalid Image', this.fieldErrors.profile_photo);
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.fieldErrors.profile_photo = 'Image size must be less than 5MB.';
        this.toast.error('Image Too Large', this.fieldErrors.profile_photo);
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.profile_photo = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let isValid = true;

    // Full Name
    const trimmedName = this.name.trim();
    if (!trimmedName) {
      this.fieldErrors.name = 'Full name is required.';
      isValid = false;
    } else if (trimmedName.length < 3 || trimmedName.length > 50) {
      this.fieldErrors.name = 'Name must be between 3 and 50 characters.';
      isValid = false;
    } else if (!/^[A-Za-z\s'\-]+$/.test(trimmedName)) {
      this.fieldErrors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes.';
      isValid = false;
    }

    // Email
    const trimmedEmail = this.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      this.fieldErrors.email = 'Email address is required.';
      isValid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      this.fieldErrors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    // Gender
    if (!this.gender) {
      this.fieldErrors.gender = 'Please select your gender.';
      isValid = false;
    }

    // Mobile Number (Exactly 10 digits)
    const cleanMobile = this.mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      this.fieldErrors.mobile = 'Mobile number is required.';
      isValid = false;
    } else if (cleanMobile.length !== 10) {
      this.fieldErrors.mobile = 'Mobile number must be exactly 10 digits.';
      isValid = false;
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      this.fieldErrors.mobile = 'Please enter a valid 10-digit mobile number starting with 6-9.';
      isValid = false;
    }

    // Delivery Address (Min 5 chars)
    const trimmedAddress = this.address.trim();
    if (!trimmedAddress) {
      this.fieldErrors.address = 'Delivery address is required.';
      isValid = false;
    } else if (trimmedAddress.length < 5) {
      this.fieldErrors.address = 'Address must be at least 5 characters long.';
      isValid = false;
    }

    // Password (Min 8 chars)
    if (!this.password) {
      this.fieldErrors.password = 'Password is required.';
      isValid = false;
    } else if (this.password.length < 8) {
      this.fieldErrors.password = 'Password must be at least 8 characters long.';
      isValid = false;
    }

    // Confirm Password
    if (!this.confirm_password) {
      this.fieldErrors.confirm_password = 'Confirm password is required.';
      isValid = false;
    } else if (this.password !== this.confirm_password) {
      this.fieldErrors.confirm_password = 'Passwords do not match.';
      isValid = false;
    }

    return isValid;
  }

  // Validate 4-digit OTP
  validateOtp(): boolean {
    this.fieldErrors.otp = undefined;
    const cleanOtp = this.otp.trim();

    if (!cleanOtp) {
      this.fieldErrors.otp = 'Please enter the 4-digit OTP.';
      return false;
    }

    if (!/^\d{4}$/.test(cleanOtp)) {
      this.fieldErrors.otp = 'OTP must be exactly 4 numeric digits.';
      return false;
    }

    return true;
  }

  // Step 1: Submit Form -> Validates uniqueness on server & dispatches OTP
  // CRITICAL: NO record is created in MySQL at this step!
  async onContinue(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateForm()) {
      this.errorMessage = 'Please fix the errors shown below.';
      this.toast.error('Validation Failed', 'Please fix the errors highlighted below.');
      return;
    }

    this.isLoading = true;

    const cleanMobile = this.mobile.replace(/\D/g, '');
    const payload: RegisterPayload = {
      name: this.name.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password,
      confirm_password: this.confirm_password,
      gender: this.gender,
      mobile: cleanMobile,
      address: this.address.trim(),
      profile_photo: this.profile_photo || undefined,
    };

    try {
      const res = await this.authService.initiateSignup(payload);

      if (res.success) {
        this.devOtpHint = res.dev_otp || cleanMobile.slice(-4);
        this.currentStep = 2;
        this.successMessage = `Verification code sent to +91 ${cleanMobile}`;
        this.toast.success('OTP Sent', `Verification code sent to +91 ${cleanMobile}`);
        this.startResendTimer(30);
      } else {
        this.errorMessage = res.message;
        this.toast.error('Registration Error', res.message);
      }
    } catch (error: any) {
      const detail = error?.error?.detail || 'Unable to connect to server. Please try again.';
      this.errorMessage = detail;
      this.toast.error('Registration Error', detail);
    } finally {
      this.isLoading = false;
    }
  }

  // Step 2: Verify OTP -> Creates record in MySQL and establishes session
  async onVerifyOtp(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateOtp()) {
      return;
    }

    this.isVerifying = true;
    const cleanMobile = this.mobile.replace(/\D/g, '');

    const completePayload = {
      name: this.name.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password,
      confirm_password: this.confirm_password,
      gender: this.gender,
      mobile: cleanMobile,
      address: this.address.trim(),
      profile_photo: this.profile_photo || undefined,
      otp: this.otp.trim(),
    };

    try {
      const res = await this.authService.completeSignup(completePayload);

      if (res.success) {
        this.currentStep = 3;
        this.successMessage = 'Account created successfully.';
        this.toast.success('Success!', 'Account created successfully.');

        // Automatically redirect to Home/Storefront after brief confirmation view
        setTimeout(() => {
          this.navigateToApp();
        }, 2200);
      } else {
        this.fieldErrors.otp = 'Invalid OTP. Please try again.';
        this.errorMessage = res.message || 'Invalid OTP. Please try again.';
        this.toast.error('Verification Failed', 'Invalid OTP. Please try again.');
      }
    } catch (error: any) {
      const detail = error?.error?.detail || 'Invalid OTP. Please try again.';
      this.fieldErrors.otp = detail;
      this.errorMessage = detail;
      this.toast.error('Verification Error', detail);
    } finally {
      this.isVerifying = false;
    }
  }

  // Resend OTP in Step 2
  async onResendOtp(): Promise<void> {
    if (this.resendCountdown > 0 || this.isVerifying) {
      return;
    }

    this.errorMessage = '';
    const cleanMobile = this.mobile.replace(/\D/g, '');

    try {
      const res = await this.authService.sendOtp(cleanMobile, 'signup_resend');
      if (res.success) {
        this.devOtpHint = res.dev_otp || cleanMobile.slice(-4);
        this.toast.success('OTP Resent', `New OTP sent to +91 ${cleanMobile}`);
        this.startResendTimer(30);
      } else {
        this.errorMessage = res.message;
        this.toast.error('Resend Failed', res.message);
      }
    } catch (error: any) {
      this.toast.error('Error', 'Unable to resend OTP right now.');
    }
  }

  // Discard OTP process and go back to Step 1
  // Crucially: Since no record was written to DB, cancelling leaves MySQL completely untouched!
  onDiscardOrEdit(): void {
    this.clearTimer();
    this.otp = '';
    this.fieldErrors = {};
    this.errorMessage = '';
    this.successMessage = '';
    this.currentStep = 1;
  }

  // Step 3 redirect trigger
  navigateToApp(): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/']);
    }
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
}