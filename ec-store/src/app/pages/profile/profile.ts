import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { ProfileService, UpdateProfilePayload } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { onImageError, PLACEHOLDER_IMAGE } from '../../core/utils/image-fallback';

interface ProfileFieldErrors {
  name?: string;
  mobile?: string;
  address?: string;
  gender?: string;
  profile_photo?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly currentUser = this.authService.currentUser;
  readonly defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

  private readonly _activeTab = signal<'profile' | 'addresses'>('profile');
  private readonly _isLoading = signal<boolean>(false);
  private readonly _successMessage = signal<string>('');
  private readonly _errorMessage = signal<string>('');

  get activeTab(): 'profile' | 'addresses' {
    return this._activeTab();
  }
  set activeTab(val: 'profile' | 'addresses') {
    this._activeTab.set(val);
    this.cdr.markForCheck();
  }

  get isLoading(): boolean {
    return this._isLoading();
  }
  set isLoading(val: boolean) {
    this._isLoading.set(val);
    this.cdr.markForCheck();
  }

  get successMessage(): string {
    return this._successMessage();
  }
  set successMessage(val: string) {
    this._successMessage.set(val);
    this.cdr.markForCheck();
  }

  get errorMessage(): string {
    return this._errorMessage();
  }
  set errorMessage(val: string) {
    this._errorMessage.set(val);
    this.cdr.markForCheck();
  }

  readonly activeTabSignal = this._activeTab.asReadonly();
  readonly isLoadingSignal = this._isLoading.asReadonly();
  readonly successMessageSignal = this._successMessage.asReadonly();
  readonly errorMessageSignal = this._errorMessage.asReadonly();

  // Form Fields
  name = '';
  email = '';
  gender = '';
  mobile = '';
  address = '';
  profile_photo = '';
  password = '';

  fieldErrors: ProfileFieldErrors = {};

  handleImgError(event: Event): void {
    onImageError(event, this.defaultAvatar);
  }

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      this.populateData(user);
    } else {
      const stored = localStorage.getItem('ec_store_current_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.authService.currentUser.set(parsed);
          this.populateData(parsed);
        } catch {
          this.router.navigate(['/login']);
          return;
        }
      } else {
        this.router.navigate(['/login']);
        return;
      }
    }

    const currentId = this.currentUser()?.id;
    if (currentId) {
      this.profileService.getProfile(currentId).subscribe({
        next: (userData: any) => {
          if (userData) {
            const u = userData.user || userData;
            this.name = u.name || this.name;
            this.email = u.email || this.email;
            this.gender = u.gender || this.gender;
            this.mobile = u.mobile || this.mobile;
            this.address = u.address || this.address;
            this.password = u.password || this.password;
            if (u.profile_photo) {
              this.profile_photo = u.profile_photo;
            }
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          console.warn('Could not load latest profile from backend:', err);
        },
      });
    }
  }

  private populateData(user: Partial<User>): void {
    this.name = user.name || '';
    this.email = user.email || '';
    this.gender = user.gender || '';
    this.mobile = user.mobile || '';
    this.address = user.address || '';
    this.profile_photo = user.profile_photo || '';
    this.cdr.markForCheck();
  }

  selectTab(tab: 'profile' | 'addresses'): void {
    this.activeTab = tab;
    this.successMessage = '';
    this.errorMessage = '';
    this.fieldErrors = {};
  }

  onFileSelected(event: Event): void {
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
        this.toast.info('Photo Selected', 'Preview updated. Click Save Changes to keep.');
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  validate(): boolean {
    this.fieldErrors = {};
    let valid = true;

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

    if (!this.gender) {
      this.fieldErrors.gender = 'Please select your gender.';
      valid = false;
    }

    const cleanMobile = this.mobile.replace(/\D/g, '');
    if (this.mobile.trim()) {
      if (cleanMobile.length !== 10) {
        this.fieldErrors.mobile = 'Mobile number must be exactly 10 digits.';
        valid = false;
      } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        this.fieldErrors.mobile = 'Please enter a valid 10-digit mobile number starting with 6-9.';
        valid = false;
      }
    }

    if (this.address.trim() && this.address.trim().length < 5) {
      this.fieldErrors.address = 'Address must be at least 5 characters long.';
      valid = false;
    }

    return valid;
  }

  updateProfile(): void {
    if (this.isLoading) return;

    this.successMessage = '';
    this.errorMessage = '';

    if (!this.validate()) {
      this.errorMessage = 'Please fix the highlighted errors.';
      this.toast.error('Validation Error', 'Please correct the invalid fields.');
      return;
    }

    const user = this.currentUser();
    const userId = user?.id;

    if (!userId) {
      this.errorMessage = 'No active user found. Please log in again.';
      this.toast.error('Session Expired', 'Please log in again.');
      return;
    }

    const payload: UpdateProfilePayload = {
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password,
      confirm_password: this.password,
      gender: this.gender,
      mobile: this.mobile.replace(/\D/g, ''),
      address: this.address.trim(),
      profile_photo: this.profile_photo,
    };

    this.isLoading = true;

    this.profileService.updateProfile(userId, payload).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        const updatedUser: User = {
          id: userId.toString(),
          name: payload.name,
          email: payload.email,
          gender: payload.gender,
          mobile: payload.mobile,
          address: payload.address,
          profile_photo: this.profile_photo || '',
        };

        localStorage.setItem(
          'ec_store_current_user',
          JSON.stringify(updatedUser)
        );

        this.authService.currentUser.set(updatedUser);

        this.name = updatedUser.name;
        this.email = updatedUser.email;
        this.gender = updatedUser.gender || '';
        this.mobile = updatedUser.mobile || '';
        this.address = updatedUser.address || '';
        this.profile_photo = updatedUser.profile_photo || '';

        this.successMessage = 'Profile Updated Successfully';
        this.toast.success('Success', 'Your profile details have been saved.');
        this.cdr.markForCheck();

        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 4000);
      },

      error: (error: any) => {
        this.isLoading = false;

        this.errorMessage =
          error?.error?.detail ||
          error?.error?.message ||
          'Failed to update profile. Please try again.';

        this.toast.error('Update Failed', this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}