import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UpdateProfilePayload {
  name: string;
  email: string;
  password?: string;
  confirm_password?: string;
  gender: string;
  mobile: string;
  address: string;
  profile_photo?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/signup';

  getProfile(userId: string | number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${userId}`);
  }

  updateProfile(userId: string | number, data: UpdateProfilePayload): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${userId}`, data);
  }
}
