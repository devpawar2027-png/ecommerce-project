import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { combineLatest, forkJoin, of, catchError } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { ProductService } from '../../core/services/product.service';
import { CategoryService, CategoryItem } from '../../core/services/category.service';
import { SubCategoryService, SubCategoryItem } from '../../core/services/subcategory.service';
import { BrandService, BrandItem } from '../../core/services/brand.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ToastService } from '../../core/services/toast.service';
import { Product } from '../../core/models/product.model';
import { onImageError, PLACEHOLDER_IMAGE } from '../../core/utils/image-fallback';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NavbarComponent],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export class ProductsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly subcategoryService = inject(SubCategoryService);
  private readonly brandService = inject(BrandService);
  private readonly cartService = inject(CartService);
  private readonly toast = inject(ToastService);
  readonly wishlistService = inject(WishlistService);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);

  handleImgError(event: Event): void {
    onImageError(event, PLACEHOLDER_IMAGE);
  }

  readonly isSearch = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  readonly categorySlug = signal<string>('');
  readonly subcategorySlug = signal<string>('');
  readonly categoryName = signal<string>('');
  readonly subcategoryName = signal<string>('');

  readonly dynamicBrands = signal<BrandItem[]>([]);
  readonly sortBy = signal<string>('relevance');
  readonly selectedBrand = signal<string>('all');
  readonly cartNotice = signal<string | null>(null);

  readonly rawProducts = signal<Product[]>([]);
  readonly isLoading = signal<boolean>(true);

  readonly availableBrands = computed(() => {
    // Collect brands from loaded products plus dynamic brands from API
    const list = this.rawProducts();
    const set = new Set<string>();

    this.dynamicBrands().forEach((b) => set.add(b.name));
    list.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });

    return Array.from(set);
  });

  readonly filteredProducts = computed(() => {
    let list = [...this.rawProducts()];

    // Filter by Brand
    if (this.selectedBrand() !== 'all') {
      const targetBrand = this.selectedBrand().toLowerCase();
      list = list.filter((p) => (p.brand || '').toLowerCase() === targetBrand);
    }

    // Sort
    const sort = this.sortBy();
    if (sort === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'discount') {
      list.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    }

    return list;
  });

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(
      ([params, queryParams]) => {
        const q = queryParams.get('q')?.trim() ?? '';
        const catSlug = params.get('category')?.toLowerCase().trim() ?? '';
        const subSlug = params.get('subcategory')?.toLowerCase().trim() ?? '';

        this.selectedBrand.set('all');
        this.isLoading.set(true);

        // Fetch categories, subcategories, brands, and products from FastAPI APIs
        forkJoin({
          categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
          subcategories: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
          brands: this.brandService.getBrands().pipe(catchError(() => of([]))),
          products: this.productService.getProducts$().pipe(catchError(() => of([]))),
        }).subscribe({
          next: ({ categories, subcategories, brands, products }) => {
            if (q) {
              this.isSearch.set(true);
              this.searchQuery.set(q);
              this.categorySlug.set('');
              this.subcategorySlug.set('');
              this.categoryName.set('Search');
              this.subcategoryName.set(`"${q}"`);
              this.dynamicBrands.set(brands || []);

              const matches = this.productService.searchProducts(q);
              this.rawProducts.set(matches);
            } else {
              this.isSearch.set(false);
              this.searchQuery.set('');
              this.categorySlug.set(catSlug);
              this.subcategorySlug.set(subSlug);

              // Match Category from API
              const matchedCat = (categories || []).find(
                (c) => this.getSlug(c.name) === catSlug || String(c.id) === catSlug
              );
              this.categoryName.set(matchedCat ? matchedCat.name : (catSlug ? this.capitalize(catSlug) : 'All Products'));

              // Match SubCategory from API
              let matchedSub: SubCategoryItem | undefined;
              if (matchedCat && subSlug) {
                matchedSub = (subcategories || []).find(
                  (s) => s.category_id === matchedCat.id && (this.getSlug(s.name) === subSlug || String(s.id) === subSlug)
                );
              }
              this.subcategoryName.set(matchedSub ? matchedSub.name : (subSlug ? this.capitalize(subSlug) : 'All Products'));

              // Category -> SubCategory -> Brand flow:
              // Filter brands belonging to this SubCategory
              if (matchedSub) {
                const subBrands = (brands || []).filter((b) => b.subcategory_id === matchedSub.id);
                this.dynamicBrands.set(subBrands);
              } else {
                this.dynamicBrands.set(brands || []);
              }

              // Filter Products
              if (catSlug && subSlug) {
                const prods = this.productService.getProductsBySubcategory(catSlug, subSlug);
                this.rawProducts.set(prods);
              } else if (catSlug) {
                const prods = this.productService.getProductsByCategory(catSlug);
                this.rawProducts.set(prods);
              } else {
                this.rawProducts.set(products || []);
              }
            }
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Error loading products page data from API:', err);
            this.rawProducts.set([]);
            this.isLoading.set(false);
          },
        });
      }
    );
  }

  isWished(productId: number): boolean {
    return this.wishlistService.isInWishlist(productId);
  }

  isProductOutOfStock(product: Product): boolean {
    const stock = typeof product.stockCount === 'number' ? product.stockCount : (product.quantity || 0);
    return stock <= 0;
  }

  toggleWishlist(product: Product, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({
        redirectUrl: '/wishlist',
        onAuthenticated: () => this.toggleWishlist(product, event),
      });
      return;
    }
    const added = this.wishlistService.toggleWishlist(product);
    if (added) {
      this.toast.success('Wishlist', `Added "${product.name}" to wishlist`);
    } else {
      this.toast.info('Wishlist', `Removed "${product.name}" from wishlist`);
    }
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();

    const stock = typeof product.stockCount === 'number' ? product.stockCount : (product.quantity || 0);
    if (stock <= 0) {
      this.toast.error('Out of Stock', `"${product.name}" is currently out of stock.`);
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.authModalService.openModal({
        redirectUrl: '/cart',
        onAuthenticated: () => this.addToCart(product, event),
      });
      return;
    }

    this.cartService.addToCart(product);
    this.cartNotice.set(`"${product.name}" added to cart!`);
    this.toast.success('Added to Cart', `"${product.name}" added to cart.`);
    setTimeout(() => {
      this.cartNotice.set(null);
    }, 2500);
  }

  viewDetails(id: number): void {
    this.router.navigate(['/product-details', id]);
  }

  selectBrandFilter(brandName: string): void {
    this.selectedBrand.set(brandName);
  }

  private capitalize(str: string): string {
    if (!str) return '';
    return str
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private getSlug(str: string): string {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
