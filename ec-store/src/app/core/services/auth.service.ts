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

export const REGISTER_API_URL = 'http://127.0.0.1:8000/signup';
export const LOGIN_API_URL = 'http://127.0.0.1:8000/login';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private readonly http = inject(HttpClient);

  private readonly CURRENT_USER_KEY = 'ec_store_current_user';

  readonly currentUser = signal<User | null>(
    this.loadCurrentUser()
  );

  readonly isLoggedIn = computed(
    () => this.currentUser() !== null
  );

  readonly authEvent$ = new Subject<'login' | 'logout'>();

  private loadCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(
        this.CURRENT_USER_KEY
      );

      return data ? JSON.parse(data) : null;

    } catch {
      return null;
    }
  }

  private saveSession(user: User): void {
    this.currentUser.set(user);

    localStorage.setItem(
      this.CURRENT_USER_KEY,
      JSON.stringify(user)
    );

    this.authEvent$.next('login');
  }

  async register(
    userData: RegisterPayload
  ): Promise<{ success: boolean; message: string }> {

    try {

      const response = await firstValueFrom(
        this.http.post<any>(
          REGISTER_API_URL,
          userData
        )
      );

      const userSession: User = {
        id: String(
          response?.id ||
          response?.user_id ||
          Date.now()
        ),
        name: userData.name,
        email: userData.email,
        gender: userData.gender,
        mobile: userData.mobile,
        address: userData.address,
        profile_photo: response?.profile_photo || response?.profilePhoto || response?.avatar,
      };

      this.saveSession(userSession);

      return {
        success: true,
        message:
          response?.message ||
          'Registration successful!'
      };

    } catch (error: any) {

      return {
        success: false,
        message:
          error?.error?.detail ||
          error?.error?.message ||
          'Registration failed'
      };

    }

  }

  async login(
    payload: LoginPayload
  ): Promise<{ success: boolean; message: string }> {

    try {

      const response = await firstValueFrom(
        this.http.post<any>(
          LOGIN_API_URL,
          payload
        )
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
      };

      this.saveSession(userSession);

      return {
        success: true,
        message:
          response?.message ||
          'Login successful!'
      };

    } catch (error: any) {

      return {
        success: false,
        message:
          error?.error?.detail ||
          error?.error?.message ||
          'Invalid email or password'
      };

    }

  }

  updateCurrentUser(user: User): void {
    this.saveSession(user);
  }

  logout(): void {

    this.currentUser.set(null);

    localStorage.removeItem(
      this.CURRENT_USER_KEY
    );

    this.authEvent$.next('logout');

  }

}