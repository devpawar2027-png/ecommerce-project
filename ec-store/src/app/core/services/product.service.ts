import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, tap, catchError } from 'rxjs';
import { Product } from '../models/product.model';
import { CategoryService } from './category.service';
import { SubCategoryService } from './subcategory.service';
import { BrandService } from './brand.service';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly categoryService = inject(CategoryService);
  private readonly subcategoryService = inject(SubCategoryService);
  private readonly brandService = inject(BrandService);

  private readonly API_URL = 'http://127.0.0.1:8000/product';

  readonly products = signal<Product[]>([]);
  readonly isLoading = signal<boolean>(false);

  constructor() {
    this.refreshProducts().subscribe();
  }

  refreshProducts(): Observable<Product[]> {
    this.isLoading.set(true);

    return forkJoin({
      rawProducts: this.http.get<any[]>(this.API_URL).pipe(catchError(() => of([]))),
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      subcategories: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
      brands: this.brandService.getBrands().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ rawProducts, categories, subcategories, brands }) => {
        const enriched = (rawProducts || [])
          .filter((p) => !p.is_deleted)
          .map((p) => this.enrichProduct(p, categories, subcategories, brands));

        this.products.set(enriched);
        this.isLoading.set(false);
        return enriched;
      }),
      catchError((err) => {
        console.error('Failed to load products from API:', err);
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  getProducts(): Product[] {
    return this.products();
  }

  getProducts$(): Observable<Product[]> {
    if (this.products().length > 0) {
      return of(this.products());
    }
    return this.refreshProducts();
  }

  getProductById(id: number): Observable<Product | undefined> {
    const existing = this.products().find((p) => p.id === id);
    if (existing) {
      return of(existing);
    }

    return forkJoin({
      p: this.http.get<any>(`${this.API_URL}/${id}`),
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      subcategories: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
      brands: this.brandService.getBrands().pipe(catchError(() => of([]))),
    }).pipe(
      map(({ p, categories, subcategories, brands }) => {
        if (!p || p.is_deleted) return undefined;
        return this.enrichProduct(p, categories, subcategories, brands);
      }),
      catchError(() => of(undefined))
    );
  }

  getProductsByCategory(categorySlug: string): Product[] {
    const slug = (categorySlug || '').toLowerCase().trim();
    return this.products().filter(
      (p) => (p.categorySlug || '').toLowerCase() === slug
    );
  }

  getProductsBySubcategory(categorySlug: string, subcategorySlug: string): Product[] {
    const cSlug = (categorySlug || '').toLowerCase().trim();
    const sSlug = (subcategorySlug || '').toLowerCase().trim();

    const matches = this.products().filter(
      (p) =>
        (p.categorySlug || '').toLowerCase() === cSlug &&
        (p.subcategorySlug || '').toLowerCase() === sSlug
    );

    if (matches.length === 0) {
      return this.getProductsByCategory(cSlug);
    }
    return matches;
  }

  getProductsByBrand(brandId: number): Product[] {
    return this.products().filter((p) => p.brand_id === brandId);
  }

  searchProducts(query: string): Product[] {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);

    return this.products().filter((p) => {
      const name = (p.name || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const category = (p.category || '').toLowerCase();
      const subcategory = (p.subcategory || '').toLowerCase();
      const details = (p.details || '').toLowerCase();
      const fullText = `${name} ${brand} ${category} ${subcategory} ${details}`;

      if (fullText.includes(q)) return true;
      return tokens.every((tok) => fullText.includes(tok));
    });
  }

  toggleWishlist(id: number): boolean {
    let updatedState = false;
    this.products.update((list) =>
      list.map((p) => {
        if (p.id === id) {
          updatedState = !p.wished;
          return { ...p, wished: updatedState };
        }
        return p;
      })
    );
    return updatedState;
  }

  private enrichProduct(
    raw: any,
    categories: any[],
    subcategories: any[],
    brands: any[]
  ): Product {
    const brandObj = brands.find((b) => b.id === raw.brand_id);
    const brandName = brandObj ? brandObj.name : 'Verified Brand';

    const subcategoryObj = brandObj
      ? subcategories.find((s) => s.id === brandObj.subcategory_id)
      : undefined;
    const subcategoryName = subcategoryObj ? subcategoryObj.name : 'General';

    const categoryObj = subcategoryObj
      ? categories.find((c) => c.id === subcategoryObj.category_id)
      : undefined;
    const categoryName = categoryObj ? categoryObj.name : 'Catalog';

    const price = Number(raw.price) || 0;
    const oldPrice = Math.round(price * 1.15);
    const discount = price > 0 ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

    const img = raw.image_url || this.resolveImage(raw.name, subcategoryName, categoryName);

    return {
      id: raw.id,
      name: raw.name,
      price: price,
      quantity: raw.quantity || 0,
      details: raw.details || '',
      brand_id: raw.brand_id,
      image_url: raw.image_url,
      is_deleted: raw.is_deleted,

      brand: brandName,
      category: categoryName,
      categorySlug: this.getSlug(categoryName),
      subcategory: subcategoryName,
      subcategorySlug: this.getSlug(subcategoryName),
      image: img,
      images: [img],
      oldPrice: oldPrice,
      discount: discount,
      rating: 4.8,
      reviews: 142,
      stock: (raw.quantity || 0) > 0,
      stockCount: raw.quantity || 0,
      description: raw.details || `Official ${raw.name} with complete manufacturer warranty.`,
      features: [
        '100% Original Brand Authentic Product',
        'Express Delivery Available',
        'Official Brand Warranty & Support',
        '7-Day Return / Replacement Guarantee'
      ],
      specifications: {
        'Brand': brandName,
        'Category': categoryName,
        'SubCategory': subcategoryName,
        'Stock Status': (raw.quantity || 0) > 0 ? `${raw.quantity} Units In Stock` : 'Out of Stock',
        'Specifications': raw.details || 'Standard Retail Package'
      },
      wished: false,
    };
  }

  private resolveImage(name: string, subcategory: string, category: string): string {
    const text = `${name} ${subcategory} ${category}`.toLowerCase();
    if (text.includes('laptop') || text.includes('macbook') || text.includes('ideapad') || text.includes('thinkpad')) {
      return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80';
    }
    if (text.includes('iphone') || text.includes('phone') || text.includes('mobile') || text.includes('samsung')) {
      return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80';
    }
    if (text.includes('headphone') || text.includes('audio') || text.includes('earbud')) {
      return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
    }
    if (text.includes('watch') || text.includes('wearable')) {
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
    }
    if (text.includes('shoe') || text.includes('sneaker') || text.includes('footwear')) {
      return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80';
    }
    if (text.includes('pet') || text.includes('dog') || text.includes('cat') || text.includes('food')) {
      return 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
  }

  private getSlug(str: string): string {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
