import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminBrand {
  id: number;
  subcategory_id: number;
  name: string;
  is_deleted?: boolean;
}

export interface BrandPayload {
  subcategory_id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminBrandService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://127.0.0.1:8000/brand';

  getBrands(): Observable<AdminBrand[]> {
    return this.http.get<AdminBrand[]>(this.API_URL);
  }

  getBrand(id: number): Observable<AdminBrand> {
    return this.http.get<AdminBrand>(`${this.API_URL}/${id}`);
  }

  createBrand(payload: BrandPayload): Observable<any> {
    return this.http.post<any>(this.API_URL, payload);
  }

  updateBrand(id: number, payload: BrandPayload): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}`, payload);
  }

  deleteBrand(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }

  restoreBrand(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/restore/${id}`, {});
  }
}
