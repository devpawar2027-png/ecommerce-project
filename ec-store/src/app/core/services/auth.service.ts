import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  gender?: string;
  mobile?: string;
  address?: string;
  profile_photo?: string;
  is_mobile_verified?: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  gender: string;
  mobile: string;
  address: string;
  profile_photo?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  message: string;
  requires_otp?: boolean;
  dev_otp?: string;
  user?: any;
}

export interface OtpResult {
  success: boolean;
  message: string;
  dev_otp?: string;
  user?: User;
}

export const SIGNUP_INITIATE_API_URL = 'http://127.0.0.1:8000/signup/initiate';
export const SIGNUP_VERIFY_API_URL = 'http://127.0.0.1:8000/signup/verify';
export const REGISTER_API_URL = 'http://127.0.0.1:8000/signup';
export const LOGIN_API_URL = 'http://127.0.0.1:8000/login';
export const SEND_OTP_API_URL = 'http://127.0.0.1:8000/send-otp';
export const VERIFY_OTP_API_URL = 'http://127.0.0.1:8000/verify-otp';
export const LOGIN_OTP_API_URL = 'http://127.0.0.1:8000/login-otp';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly CURRENT_USER_KEY = 'ec_store_current_user';

  readonly currentUser = signal<User | null>(this.loadCurrentUser());

  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  readonly authEvent$ = new Subject<'login' | 'logout'>();

  private loadCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(this.CURRENT_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public saveSession(user: User): void {
    this.currentUser.set(user);
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    this.authEvent$.next('login');
  }

  /**
   * Step 1 of Signup: Validate fields & uniqueness, send OTP to mobile.
   * Crucially: NO permanent record is written to MySQL until Step 2 is verified!
   */
  async initiateSignup(
    userData: RegisterPayload
  ): Promise<{ success: boolean; message: string; dev_otp?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(SIGNUP_INITIATE_API_URL, userData)
      );

      return {
        success: true,
        message: response?.message || 'Verification code sent to your mobile.',
        dev_otp: response?.dev_otp,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.error?.detail ||
          error?.error?.message ||
          'Failed to initiate registration.',
      };
    }
  }

  /**
   * Step 2 of Signup: Verify 4-digit OTP, insert record into MySQL with is_mobile_verified = true,
   * establish user session and return authenticated user.
   */
  async completeSignup(
    userData: RegisterPayload & { otp: string }
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(SIGNUP_VERIFY_API_URL, userData)
      );

      const resUser = response?.user || response;
      const userSession: User = {
        id: String(resUser?.id || Date.now()),
        name: resUser?.name || userData.name,
        email: resUser?.email || userData.email,
        gender: resUser?.gender || userData.gender,
        mobile: resUser?.mobile || userData.mobile,
        address: resUser?.address || userData.address,
        profile_photo: resUser?.profile_photo || userData.profile_photo,
        is_mobile_verified: true,
      };

      this.saveSession(userSession);

      return {
        success: true,
        message: response?.message || 'Account created successfully.',
        user: userSession,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.error?.detail ||
          error?.error?.message ||
          'Invalid OTP. Please try again.',
      };
    }
  }

  async register(userData: RegisterPayload): Promise<RegisterResult> {
    const res = await this.initiateSignup(userData);
    return {
      success: res.success,
      message: res.message,
      requires_otp: true,
      dev_otp: res.dev_otp,
    };
  }

  async login(
    payload: LoginPayload
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      const response = await firstValueFrom(
        this.http.post<any>(LOGIN_API_URL, payload)
      );

      const resUser = response?.user || response;
      const userSession: User = {
        id: String(
          resUser?.id ||
          resUser?.user_id ||
          response?.id ||
          response?.user_id ||
          Date.now()
        ),
        name: resUser?.name || response?.name || '',
        email: resUser?.email || payload.email,
        gender: resUser?.gender || response?.gender,
        mobile: resUser?.mobile || response?.mobile,
        address: resUser?.address || response?.address,
        profile_photo:
          resUser?.profile_photo ||
          response?.profile_photo ||
          resUser?.profilePhoto ||
          response?.profilePhoto ||
          resUser?.avatar ||
          response?.avatar,
        is_mobile_verified: resUser?.is_mobile_verified ?? true,
      };

      this.saveSession(userSession);

      return {
        success: true,
        message: response?.message || 'Login successful!',
        user: userSession,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.error?.detail ||
          error?.error?.message ||
          'Invalid email or password',
      };
    }
  }

  async sendOtp(
    mobile: string,
    purpose: 'login' | 'signup_resend' = 'login'
  ): Promise<OtpResult> {
    try {
      const cleanMobile = mobile.replace(/\D/g, '');
      const response = await firstValueFrom(
        this.http.post<any>(SEND_OTP_API_URL, {
          mobile: cleanMobile,
          purpose,
        })
      );

      return {
        success: true,
        message: response?.message || `OTP sent to +91 ${cleanMobile}`,
        dev_otp: response?.dev_otp,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.error?.detail ||
          error?.error?.message ||
          'Failed to send OTP. Please check your mobile number.',
      };
    }
  }

  async verifyOtp(payload: {
    mobile: string;
    otp: string;
  }): Promise<OtpResult> {
    try {
      const cleanMobile = payload.mobile.replace(/\D/g, '');
      const response = await firstValueFrom(
        this.http.post<any>(VERIFY_OTP_API_URL, {
          mobile: cleanMobile,
          otp: payload.otp.trim(),
        })
      );

      const resUser = response?.user || response;
      const userSession: User = {
        id: String(resUser?.id || Date.now()),
        name: resUser?.name || '',
        email: resUser?.email || '',
        gender: resUser?.gender,
        mobile: resUser?.mobile || cleanMobile,
        address: resUser?.address,
        profile_photo: resUser?.profile_photo,
        is_mobile_verified: true,
      };

      this.saveSession(userSession);

      return {
        success: true,
        message: response?.message || 'Mobile number verified successfully.',
        user: userSession,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.error?.detail ||
          error?.error?.message ||
          'Invalid OTP. Please try again.',
      };
    }
  }

  async loginWithOtp(payload: {
    mobile: string;
    otp: string;
  }): Promise<OtpResult> {
    try {
      const cleanMobile = payload.mobile.replace(/\D/g, '');
      const response = await firstValueFrom(
        this.http.post<any>(LOGIN_OTP_API_URL, {
          mobile: cleanMobile,
          otp: payload.otp.trim(),
        })
      );

      const resUser = response?.user || response;
      const userSession: User = {
        id: String(resUser?.id || Date.now()),
        name: resUser?.name || '',
        email: resUser?.email || '',
        gender: resUser?.gender,
        mobile: resUser?.mobile || cleanMobile,
        address: resUser?.address,
        profile_photo: resUser?.profile_photo,
        is_mobile_verified: true,
      };

      this.saveSession(userSession);

      return {
        success: true,
        message: response?.message || 'Login successful!',
        user: userSession,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.error?.detail ||
          error?.error?.message ||
          'Invalid OTP. Please try again.',
      };
    }
  }

  updateCurrentUser(user: User): void {
    this.saveSession(user);
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(this.CURRENT_USER_KEY);
    this.authEvent$.next('logout');
  }
}