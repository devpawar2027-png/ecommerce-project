import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private http = inject(HttpClient);

  private API_URL = 'http://127.0.0.1:8000';

  getProfile(userId: number): Observable<any> {
    return this.http.get(`${this.API_URL}/signup/${userId}`);
  }

  updateProfile(userId: number, data: any): Observable<any> {
    return this.http.put(`${this.API_URL}/signup/${userId}`, data);
  }
}