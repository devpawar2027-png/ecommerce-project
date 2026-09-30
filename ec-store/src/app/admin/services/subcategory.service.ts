import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminSubCategory {
  id: number;
  category_id: number;
  name: string;
  is_deleted?: boolean;
}

export interface SubCategoryPayload {
  category_id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminSubCategoryService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://127.0.0.1:8000/subcategory';

  getSubCategories(): Observable<AdminSubCategory[]> {
    return this.http.get<AdminSubCategory[]>(this.API_URL);
  }

  getSubCategory(id: number): Observable<AdminSubCategory> {
    return this.http.get<AdminSubCategory>(`${this.API_URL}/${id}`);
  }

  createSubCategory(payload: SubCategoryPayload): Observable<any> {
    return this.http.post<any>(this.API_URL, payload);
  }

  updateSubCategory(id: number, payload: SubCategoryPayload): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}`, payload);
  }

  deleteSubCategory(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }

  restoreSubCategory(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/restore/${id}`, {});
  }
}
