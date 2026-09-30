import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, forkJoin } from 'rxjs';
import { Product } from '../models/product.model';
import { ProductService } from './product.service';
import { AuthService } from './auth.service';

export interface CartItem {
  id?: number;
  user_id?: number;
  product_id?: number;
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);

  private readonly API_URL = 'http://127.0.0.1:8000/cart';
  private readonly CART_STORAGE_KEY = 'ec_store_cart_items';

  readonly cartItems = signal<CartItem[]>(this.loadCartFromStorage());
  readonly isLoading = signal<boolean>(false);

  readonly cartCount = computed(() =>
    this.cartItems().reduce((total, item) => total + item.quantity, 0)
  );

  readonly cartTotal = computed(() =>
    this.cartItems().reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    )
  );

  readonly cartMRP = computed(() =>
    this.cartItems().reduce(
      (total, item) =>
        total + (item.product.oldPrice || item.product.price) * item.quantity,
      0
    )
  );

  readonly cartSavings = computed(() => this.cartMRP() - this.cartTotal());

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.syncFromApi();
    } else {
      this.cartItems.set([]);
    }

    this.authService.authEvent$.subscribe((event) => {
      if (event === 'login') {
        this.syncFromApi();
      } else if (event === 'logout') {
        this.clearLocalCart();
      }
    });
  }

  private getActiveUserId(): number | null {
    const user = this.authService.currentUser();
    return user && user.id ? Number(user.id) : null;
  }

  private loadCartFromStorage(): CartItem[] {
    if (!this.authService.isLoggedIn()) {
      return [];
    }
    try {
      const stored = localStorage.getItem(this.CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private persist(items: CartItem[]): void {
    if (!this.authService.isLoggedIn()) return;
    try {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }

  syncFromApi(): void {
    const userId = this.getActiveUserId();
    if (!userId) {
      this.cartItems.set([]);
      return;
    }
    this.isLoading.set(true);

    forkJoin({
      dbCarts: this.http.get<any[]>(`${this.API_URL}?user_id=${userId}`).pipe(catchError(() => of([]))),
      products: this.productService.getProducts$().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ dbCarts, products }) => {
        if (dbCarts && dbCarts.length > 0) {
          const mapped: CartItem[] = dbCarts
            .filter((c) => !c.is_deleted)
            .map((c) => {
              const matchedProduct = products.find((p) => p.id === c.product_id);
              const product: Product = matchedProduct || {
                id: c.product_id,
                name: `Product #${c.product_id}`,
                price: 1999,
                quantity: 10,
                details: 'In Stock',
                image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
                brand: 'Verified Brand',
                category: 'General',
                oldPrice: 2499,
                discount: 20,
              };

              return {
                id: c.id,
                user_id: c.user_id,
                product_id: c.product_id,
                product,
                quantity: c.quantity || 1,
              };
            });

          this.cartItems.set(mapped);
          this.persist(mapped);
        } else {
          this.cartItems.set([]);
          this.persist([]);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  addToCart(product: Product, quantity = 1): void {
    const userId = this.getActiveUserId();
    if (!userId) {
      console.warn('Cannot add to cart: User not logged in.');
      return;
    }

    const qtyToAdd = Math.max(1, quantity);
    const existingIndex = this.cartItems().findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      const existing = this.cartItems()[existingIndex];
      const newQty = existing.quantity + qtyToAdd;

      this.cartItems.update((items) =>
        items.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: newQty } : item
        )
      );
      this.persist(this.cartItems());

      if (existing.id) {
        this.http.put(`${this.API_URL}/${existing.id}`, { quantity: newQty }).subscribe({
          error: (err) => console.error('Error updating cart on API:', err),
        });
      }
    } else {
      const tempItem: CartItem = {
        user_id: userId,
        product_id: product.id,
        product,
        quantity: qtyToAdd,
      };

      this.cartItems.update((items) => [...items, tempItem]);
      this.persist(this.cartItems());

      this.http.post<any>(this.API_URL, {
        user_id: userId,
        product_id: product.id,
        quantity: qtyToAdd,
      }).subscribe({
        next: (res) => {
          if (res?.cart?.id) {
            this.cartItems.update((items) =>
              items.map((i) =>
                i.product.id === product.id ? { ...i, id: res.cart.id } : i
              )
            );
            this.persist(this.cartItems());
          }
        },
        error: (err) => console.error('Error posting to cart API:', err),
      });
    }
  }

  removeFromCart(productId: number): void {
    const item = this.cartItems().find((i) => i.product.id === productId);

    this.cartItems.update((items) => {
      const updated = items.filter((i) => i.product.id !== productId);
      this.persist(updated);
      return updated;
    });

    if (item?.id) {
      this.http.delete(`${this.API_URL}/${item.id}`).subscribe({
        error: (err) => console.error('Error deleting from cart API:', err),
      });
    }
  }

  increaseQuantity(productId: number): void {
    const item = this.cartItems().find((i) => i.product.id === productId);
    if (!item) return;

    const max = item.product.stockCount || 10;
    const newQty = Math.min(item.quantity + 1, max);

    this.cartItems.update((items) =>
      items.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQty } : i
      )
    );
    this.persist(this.cartItems());

    if (item.id) {
      this.http.put(`${this.API_URL}/${item.id}`, { quantity: newQty }).subscribe({
        error: (err) => console.error('Error updating cart quantity on API:', err),
      });
    }
  }

  decreaseQuantity(productId: number): void {
    const item = this.cartItems().find((i) => i.product.id === productId);
    if (!item) return;

    if (item.quantity <= 1) {
      this.removeFromCart(productId);
      return;
    }

    const newQty = item.quantity - 1;
    this.cartItems.update((items) =>
      items.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQty } : i
      )
    );
    this.persist(this.cartItems());

    if (item.id) {
      this.http.put(`${this.API_URL}/${item.id}`, { quantity: newQty }).subscribe({
        error: (err) => console.error('Error updating cart quantity on API:', err),
      });
    }
  }

  clearLocalCart(): void {
    this.cartItems.set([]);
    try {
      localStorage.removeItem(this.CART_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  clearCart(): void {
    const items = [...this.cartItems()];
    this.cartItems.set([]);
    localStorage.removeItem(this.CART_STORAGE_KEY);

    for (const item of items) {
      if (item.id) {
        this.http.delete(`${this.API_URL}/${item.id}`).subscribe({
          error: (err) => console.error('Error deleting cart item:', err),
        });
      }
    }
  }
}
