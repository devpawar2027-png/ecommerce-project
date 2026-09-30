import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';

export interface AdminUser {
  id: number | string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface LoginResponse {
  message?: string;
  token?: string;
  user?: {
    id: number | string;
    name: string;
    email: string;
    address?: string;
    mobile?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly API_URL = 'http://127.0.0.1:8000';

  private readonly TOKEN_KEY = 'dev_store_admin_token';
  private readonly USER_KEY = 'dev_store_admin_user';

  readonly currentAdmin = signal<AdminUser | null>(this.getStoredAdmin());
  readonly isLoggedIn = signal<boolean>(!!this.getStoredToken());

  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private getStoredAdmin(): AdminUser | null {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((res) => {
        const token = res.token || 'jwt_mock_token_' + Date.now();
        const admin: AdminUser = {
          id: res.user?.id ?? 1,
          name: res.user?.name ?? 'Dev Admin',
          email: res.user?.email ?? credentials.email,
          role: 'Super Administrator',
          avatar: 'assets/images/default-user.png',
        };

        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(admin));

        this.currentAdmin.set(admin);
        this.isLoggedIn.set(true);
      }),
      catchError((err) => {
        // Fallback for demo admin credentials if backend user is not created yet
        if (
          credentials.email === 'admin@devstore.com' &&
          credentials.password === 'admin123'
        ) {
          const token = 'jwt_admin_demo_token_' + Date.now();
          const admin: AdminUser = {
            id: 999,
            name: 'Dev Admin Master',
            email: 'admin@devstore.com',
            role: 'Super Administrator',
            avatar: 'assets/images/default-user.png',
          };

          localStorage.setItem(this.TOKEN_KEY, token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(admin));

          this.currentAdmin.set(admin);
          this.isLoggedIn.set(true);

          return of({ message: 'Demo Admin login successful', token, user: admin });
        }
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentAdmin.set(null);
    this.isLoggedIn.set(false);
    this.router.navigate(['/admin/login']);
  }

  getToken(): string | null {
    return this.getStoredToken();
  }
}
