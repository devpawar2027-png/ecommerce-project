import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminProduct {
  id: number;
  brand_id: number;
  name: string;
  price: number;
  quantity: number;
  details: string;
  image_url?: string;
  is_deleted?: boolean;
}

export interface ProductPayload {
  brand_id: number;
  name: string;
  price: number;
  quantity: number;
  details: string;
  image_url?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminProductService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://127.0.0.1:8000/product';

  getProducts(): Observable<AdminProduct[]> {
    return this.http.get<AdminProduct[]>(this.API_URL);
  }

  getProduct(id: number): Observable<AdminProduct> {
    return this.http.get<AdminProduct>(`${this.API_URL}/${id}`);
  }

  createProduct(payload: ProductPayload): Observable<any> {
    return this.http.post<any>(this.API_URL, payload);
  }

  updateProduct(id: number, payload: Partial<ProductPayload>): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}`, payload);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }

  restoreProduct(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/restore/${id}`, {});
  }
}
