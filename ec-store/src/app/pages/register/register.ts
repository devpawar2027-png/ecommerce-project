import { Component, inject, OnInit } from '@angular/core';
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
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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

  fieldErrors: RegisterFieldErrors = {};
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  returnUrl = '';

  readonly genderOptions = ['Male', 'Female', 'Other'];

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '';
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

    // Name Validation (3-50 chars, alphabetic + spaces/hyphens/apostrophes)
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

    // Email Validation
    const trimmedEmail = this.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      this.fieldErrors.email = 'Email address is required.';
      isValid = false;
    } else if (!emailRegex.test(trimmedEmail)) {
      this.fieldErrors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    // Gender Validation
    if (!this.gender) {
      this.fieldErrors.gender = 'Please select your gender.';
      isValid = false;
    }

    // Mobile Validation (Exact 10 digits)
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

    // Address Validation (Min 5 chars)
    const trimmedAddress = this.address.trim();
    if (!trimmedAddress) {
      this.fieldErrors.address = 'Delivery address is required.';
      isValid = false;
    } else if (trimmedAddress.length < 5) {
      this.fieldErrors.address = 'Address must be at least 5 characters long.';
      isValid = false;
    }

    // Password Validation (Min 8 characters)
    if (!this.password) {
      this.fieldErrors.password = 'Password is required.';
      isValid = false;
    } else if (this.password.length < 8) {
      this.fieldErrors.password = 'Password must be at least 8 characters long.';
      isValid = false;
    }

    // Confirm Password Validation
    if (!this.confirm_password) {
      this.fieldErrors.confirm_password = 'Confirm password is required.';
      isValid = false;
    } else if (this.password !== this.confirm_password) {
      this.fieldErrors.confirm_password = 'Passwords do not match.';
      isValid = false;
    }

    return isValid;
  }

  async onRegister(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.validateForm()) {
      this.errorMessage = 'Please correct the highlighted errors before submitting.';
      this.toast.error('Validation Failed', 'Please fix the errors shown below.');
      return;
    }

    this.isLoading = true;

    const payload: RegisterPayload = {
      name: this.name.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.password,
      confirm_password: this.confirm_password,
      gender: this.gender,
      mobile: this.mobile.replace(/\D/g, ''),
      address: this.address.trim(),
      profile_photo: this.profile_photo || undefined,
    };

    try {
      const res = await this.authService.register(payload);

      if (res.success) {
        this.successMessage = 'Account created successfully! Redirecting to login...';
        this.toast.success('Registration Successful!', 'Welcome to EC Store.');

        setTimeout(() => {
          if (this.returnUrl) {
            this.router.navigate(['/login'], {
              queryParams: { returnUrl: this.returnUrl },
            });
          } else {
            this.router.navigate(['/login']);
          }
        }, 800);
      } else {
        this.errorMessage = res.message;
        this.toast.error('Registration Failed', res.message);
      }
    } catch (error: any) {
      const detail = error?.error?.detail || 'Unable to connect to server. Please try again.';
      this.errorMessage = detail;
      this.toast.error('Registration Error', detail);
    } finally {
      this.isLoading = false;
    }
  }
}