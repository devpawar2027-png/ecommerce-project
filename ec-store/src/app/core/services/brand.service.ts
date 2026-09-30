import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface BrandItem {
  id: number;
  subcategory_id: number;
  name: string;
  is_deleted?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://127.0.0.1:8000/brand';

  getBrands(): Observable<BrandItem[]> {
    return this.http.get<BrandItem[]>(this.API_URL).pipe(
      map((brands) => (brands || []).filter((b) => !b.is_deleted))
    );
  }

  getBrandsBySubcategoryId(subcategoryId: number): Observable<BrandItem[]> {
    return this.getBrands().pipe(
      map((brands) => brands.filter((b) => b.subcategory_id === subcategoryId))
    );
  }

  getBrandById(id: number): Observable<BrandItem> {
    return this.http.get<BrandItem>(`${this.API_URL}/${id}`);
  }
}
