import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminUserDetails {
  id: number;
  name: string;
  email: string;
  mobile?: string;
  gender?: string;
  address?: string;
  profile_photo?: string;
  is_deleted?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AdminUserService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://127.0.0.1:8000';

  getUsers(): Observable<AdminUserDetails[]> {
    return this.http.get<AdminUserDetails[]>(`${this.API_URL}/signup`);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/login/${id}`);
  }

  restoreUser(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/login/restore/${id}`, {});
  }
}
