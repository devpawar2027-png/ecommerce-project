import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubCategoryItem {
  id: number;
  category_id: number;
  name: string;
  is_deleted?: boolean;
  slug?: string;
  image?: string;
  offer?: string;
  itemCount?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SubCategoryService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://127.0.0.1:8000/subcategory';

  getSubCategories(): Observable<SubCategoryItem[]> {
    return this.http.get<SubCategoryItem[]>(this.API_URL);
  }

  getSubCategoryById(id: number): Observable<SubCategoryItem> {
    return this.http.get<SubCategoryItem>(`${this.API_URL}/${id}`);
  }
}
