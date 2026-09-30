import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, forkJoin } from 'rxjs';
import { Product } from '../models/product.model';
import { ProductService } from './product.service';
import { AuthService } from './auth.service';

interface DbWishlistEntry {
  id: number;
  user_id: number;
  product_id: number;
  is_deleted?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);

  private readonly API_URL = 'http://127.0.0.1:8000/wishlist';
  private readonly WISHLIST_STORAGE_KEY = 'ec_store_wishlist_items';

  readonly wishlistItems = signal<Product[]>(this.loadFromStorage());
  readonly wishlistEntries = signal<DbWishlistEntry[]>([]);
  readonly isLoading = signal<boolean>(false);

  readonly wishlistCount = computed(() => this.wishlistItems().length);

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.syncFromApi();
    } else {
      this.wishlistItems.set([]);
    }

    this.authService.authEvent$.subscribe((event) => {
      if (event === 'login') {
        this.syncFromApi();
      } else if (event === 'logout') {
        this.clearLocalWishlist();
      }
    });
  }

  private getActiveUserId(): number | null {
    const user = this.authService.currentUser();
    return user && user.id ? Number(user.id) : null;
  }

  private loadFromStorage(): Product[] {
    if (!this.authService.isLoggedIn()) {
      return [];
    }
    try {
      const stored = localStorage.getItem(this.WISHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private persist(items: Product[]): void {
    if (!this.authService.isLoggedIn()) return;
    try {
      localStorage.setItem(this.WISHLIST_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage', e);
    }
  }

  syncFromApi(): void {
    const userId = this.getActiveUserId();
    if (!userId) {
      this.wishlistItems.set([]);
      this.wishlistEntries.set([]);
      return;
    }
    this.isLoading.set(true);

    forkJoin({
      entries: this.http.get<DbWishlistEntry[]>(`${this.API_URL}?user_id=${userId}`).pipe(catchError(() => of([]))),
      products: this.productService.getProducts$().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ entries, products }) => {
        if (entries && entries.length > 0) {
          const activeEntries = entries.filter((e) => !e.is_deleted);
          this.wishlistEntries.set(activeEntries);

          const matchedProducts: Product[] = activeEntries.map((e) => {
            const found = products.find((p) => p.id === e.product_id);
            return found ? { ...found, wished: true } : {
              id: e.product_id,
              name: `Product #${e.product_id}`,
              price: 1999,
              quantity: 10,
              details: 'In Stock',
              image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
              brand: 'Verified Brand',
              category: 'General',
              wished: true,
            };
          });

          this.wishlistItems.set(matchedProducts);
          this.persist(matchedProducts);
        } else {
          this.wishlistItems.set([]);
          this.wishlistEntries.set([]);
          this.persist([]);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  isInWishlist(productId: number): boolean {
    if (!this.authService.isLoggedIn()) return false;
    return this.wishlistItems().some((item) => item.id === productId);
  }

  addToWishlist(product: Product): void {
    const userId = this.getActiveUserId();
    if (!userId) {
      console.warn('Cannot add to wishlist: User not logged in.');
      return;
    }

    if (this.isInWishlist(product.id)) return;

    const item: Product = { ...product, wished: true };

    this.wishlistItems.update((items) => {
      const updated = [...items, item];
      this.persist(updated);
      return updated;
    });

    this.http.post<any>(this.API_URL, {
      user_id: userId,
      product_id: product.id,
    }).subscribe({
      next: (res) => {
        if (res?.wishlist?.id) {
          this.wishlistEntries.update((entries) => [...entries, res.wishlist]);
        }
      },
      error: (err) => console.error('Error adding to wishlist API:', err),
    });
  }

  removeFromWishlist(productId: number): void {
    this.wishlistItems.update((items) => {
      const updated = items.filter((item) => item.id !== productId);
      this.persist(updated);
      return updated;
    });

    const entry = this.wishlistEntries().find((e) => e.product_id === productId);
    if (entry?.id) {
      this.http.delete(`${this.API_URL}/${entry.id}`).subscribe({
        next: () => {
          this.wishlistEntries.update((entries) => entries.filter((e) => e.id !== entry.id));
        },
        error: (err) => console.error('Error removing from wishlist API:', err),
      });
    }
  }

  toggleWishlist(product: Product): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }
    if (this.isInWishlist(product.id)) {
      this.removeFromWishlist(product.id);
      return false;
    } else {
      this.addToWishlist(product);
      return true;
    }
  }

  getWishlist(): Product[] {
    return this.wishlistItems();
  }

  clearLocalWishlist(): void {
    this.wishlistItems.set([]);
    this.wishlistEntries.set([]);
    try {
      localStorage.removeItem(this.WISHLIST_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  clearWishlist(): void {
    const entries = [...this.wishlistEntries()];
    this.wishlistItems.set([]);
    this.wishlistEntries.set([]);
    localStorage.removeItem(this.WISHLIST_STORAGE_KEY);

    for (const entry of entries) {
      if (entry.id) {
        this.http.delete(`${this.API_URL}/${entry.id}`).subscribe();
      }
    }
  }
}
