import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, tap, catchError } from 'rxjs';
import { CartItem } from './cart.service';
import { AuthService } from './auth.service';

export interface OrderCustomer {
  name: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  paymentMethod: string;
}

export interface PlacedOrder {
  orderId: string;
  date: string;
  customer: OrderCustomer;
  items: CartItem[];
  totalAmount: number;
}

export interface DbOrder {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  total_price: number;
  is_deleted?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly API_URL = 'http://127.0.0.1:8000/order';
  private readonly LAST_ORDER_KEY = 'ec_store_last_order';

  readonly lastOrder = signal<PlacedOrder | null>(this.loadLastOrder());
  readonly orders = signal<DbOrder[]>([]);
  readonly isLoading = signal<boolean>(false);

  private getActiveUserId(): number {
    const user = this.authService.currentUser();
    return user && user.id ? Number(user.id) : 1;
  }

  private loadLastOrder(): PlacedOrder | null {
    try {
      const data = localStorage.getItem(this.LAST_ORDER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  placeOrder(customer: OrderCustomer, items: CartItem[], totalAmount: number): Observable<any> {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const order: PlacedOrder = {
      orderId,
      date: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      customer,
      items: [...items],
      totalAmount,
    };

    this.lastOrder.set(order);
    try {
      localStorage.setItem(this.LAST_ORDER_KEY, JSON.stringify(order));
    } catch (e) {
      console.error('Failed to store order locally', e);
    }

    const userId = this.getActiveUserId();

    // Persist each product ordered into FastAPI / MySQL
    const postRequests = items.map((item) =>
      this.http.post<any>(this.API_URL, {
        user_id: userId,
        product_id: item.product.id,
        quantity: item.quantity,
      }).pipe(
        catchError((err) => {
          console.error(`Failed to record order item for product ${item.product.id}:`, err);
          return of(null);
        })
      )
    );

    return (postRequests.length > 0 ? forkJoin(postRequests) : of([])).pipe(
      tap(() => {
        this.fetchUserOrders().subscribe();
      })
    );
  }

  fetchUserOrders(): Observable<DbOrder[]> {
    const userId = this.getActiveUserId();
    this.isLoading.set(true);

    return this.http.get<DbOrder[]>(`${this.API_URL}?user_id=${userId}`).pipe(
      tap((data) => {
        this.orders.set(data || []);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        console.error('Failed to load user orders:', err);
        this.isLoading.set(false);
        return of([]);
      })
    );
  }
}
