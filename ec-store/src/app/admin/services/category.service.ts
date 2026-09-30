import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminCategory {
  id: number;
  name: string;
  is_deleted?: boolean;
}

export interface CategoryPayload {
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminCategoryService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://127.0.0.1:8000/category';

  getCategories(): Observable<AdminCategory[]> {
    return this.http.get<AdminCategory[]>(this.API_URL);
  }

  getCategory(id: number): Observable<AdminCategory> {
    return this.http.get<AdminCategory>(`${this.API_URL}/${id}`);
  }

  createCategory(payload: CategoryPayload): Observable<any> {
    return this.http.post<any>(this.API_URL, payload);
  }

  updateCategory(id: number, payload: CategoryPayload): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}`, payload);
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }

  restoreCategory(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/restore/${id}`, {});
  }
}
