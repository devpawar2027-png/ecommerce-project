import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface AdminOrder {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  total_price: number;
  status?: OrderStatus;
  created_at?: string;
  is_deleted?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AdminOrderService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://127.0.0.1:8000/order';

  getOrders(): Observable<AdminOrder[]> {
    return this.http.get<AdminOrder[]>(this.API_URL);
  }

  getOrder(id: number): Observable<AdminOrder> {
    return this.http.get<AdminOrder>(`${this.API_URL}/${id}`);
  }

  updateOrder(id: number, data: { quantity?: number; status?: OrderStatus }): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}`, data);
  }

  deleteOrder(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }

  restoreOrder(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/restore/${id}`, {});
  }
}
