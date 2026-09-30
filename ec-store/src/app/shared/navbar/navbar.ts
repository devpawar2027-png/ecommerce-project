import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { CategoryItem, CategoryService } from '../../core/services/category.service';

export interface CategoryMatch {
  name: string;
  slug: string;
  subSlug?: string;
  isSub: boolean;
}

export type { CategoryItem };

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly cartService = inject(CartService);
  readonly wishlistService = inject(WishlistService);
  readonly authService = inject(AuthService);
  readonly authModalService = inject(AuthModalService);

  // Dynamic categories from API
  categories: CategoryItem[] = [];
  isLoading = true;

  categoriesOpen = false;
  mobileOpen = false;
  profileDropdownOpen = false;

  readonly currentUrl = signal<string>(this.router.url);

  readonly searchQuery = signal<string>('');
  readonly searchDropdownOpen = signal<boolean>(false);

  readonly cartCount = this.cartService.cartCount;
  readonly wishlistCount = this.wishlistService.wishlistCount;
  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly currentUser = this.authService.currentUser;

  readonly suggestions = computed<Product[]>(() => {
    const q = this.searchQuery().trim();
    if (!q) return [];
    return this.productService.searchProducts(q).slice(0, 6);
  });

  readonly matchingCategories = computed<CategoryMatch[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const results: CategoryMatch[] = [];

    for (const cat of this.categories) {
      if (cat.name.toLowerCase().includes(q)) {
        results.push({ name: cat.name, slug: cat.slug || this.getCategorySlug(cat), isSub: false });
      }
      if (results.length >= 5) break;
    }
    return results;
  });

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        this.currentUrl.set(
          event.urlAfterRedirects || event.url
        );
      });
  }

  ngOnInit(): void {
    this.loadCategories();

    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q');
      if (q !== null) {
        this.searchQuery.set(q);
      }
    });
  }

  loadCategories(): void {
    this.isLoading = true;
    this.categoryService.getCategories().subscribe({
      next: (data: CategoryItem[]) => {
        this.categories = (data || []).filter((cat) => !cat.is_deleted);
        this.isLoading = false;
        this.cdr.markForCheck();
        console.log('Navbar Categories:', this.categories);
      },
      error: (error) => {
        console.error('Category Error:', error);
        this.categories = [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  getCategorySlug(cat: CategoryItem): string {
    if (!cat) return '';
    if (cat.slug) return cat.slug;
    if (!cat.name) return String(cat.id ?? '');
    return cat.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  isActiveCategory(slug?: string, exact = false): boolean {
    if (!slug) return false;
    const url = this.currentUrl().toLowerCase();
    if (exact || slug === '') {
      return url === '/' || url === '/home' || url.startsWith('/?') || url === '';
    }
    return url.includes(slug.toLowerCase());
  }

  getCategoryIconType(name?: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('electr') || n.includes('tech') || n.includes('laptop')) return 'electronics';
    if (n.includes('pet')) return 'pets';
    if (n.includes('mob') || n.includes('phone')) return 'mobiles';
    if (n.includes('fash') || n.includes('cloth') || n.includes('wear') || n.includes('apparel')) return 'fashion';
    if (n.includes('home') || n.includes('furn') || n.includes('living')) return 'home';
    if (n.includes('appliance') || n.includes('audio') || n.includes('sound')) return 'appliances';
    if (n.includes('beauty') || n.includes('care') || n.includes('makeup')) return 'beauty';
    if (n.includes('toy') || n.includes('game') || n.includes('baby')) return 'toys';
    if (n.includes('food') || n.includes('groc') || n.includes('health') || n.includes('snack')) return 'food';
    if (n.includes('auto') || n.includes('vehic') || n.includes('bike')) return 'auto';
    if (n.includes('sport') || n.includes('fit')) return 'sports';
    if (n.includes('book') || n.includes('station')) return 'books';
    return 'default';
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchDropdownOpen.set(value.trim().length > 0);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim().length > 0) {
      this.searchDropdownOpen.set(true);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchDropdownOpen.set(false);
  }

  closeDropdown(): void {
    this.searchDropdownOpen.set(false);
  }

  handleImgError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target) {
      target.onerror = null;
      target.src = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
    }
  }

  submitSearch(): void {
    const q = this.searchQuery().trim();
    this.closeDropdown();
    this.closeMenus();
    if (q.length >= 2) {
      this.router.navigate(['/products'], { queryParams: { q } });
    }
  }

  selectProduct(productId: number): void {
    this.closeDropdown();
    this.closeMenus();
    this.router.navigate(['/product-details', productId]);
  }

  selectCategory(item: CategoryMatch): void {
    this.closeDropdown();
    this.closeMenus();
    if (item.isSub && item.subSlug) {
      this.router.navigate(['/products', item.slug, item.subSlug]);
    } else {
      this.router.navigate(['/category', item.slug]);
    }
  }

  toggleCategories(event: Event): void {
    event.stopPropagation();
    this.categoriesOpen = !this.categoriesOpen;
    this.mobileOpen = false;
    this.closeDropdown();
  }

  toggleMobile(event: Event): void {
    event.stopPropagation();
    this.mobileOpen = !this.mobileOpen;
    this.categoriesOpen = false;
  }

  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    this.profileDropdownOpen = !this.profileDropdownOpen;
    this.categoriesOpen = false;
  }

  closeMenus(): void {
    this.categoriesOpen = false;
    this.mobileOpen = false;
    this.profileDropdownOpen = false;
  }

  onWishlistClick(event: Event): void {
    this.closeMenus();
    if (!this.isLoggedIn()) {
      event.preventDefault();
      event.stopPropagation();
      this.authModalService.openModal({ redirectUrl: '/wishlist' });
    } else {
      this.router.navigate(['/wishlist']);
    }
  }

  onCartClick(event: Event): void {
    this.closeMenus();
    if (!this.isLoggedIn()) {
      event.preventDefault();
      event.stopPropagation();
      this.authModalService.openModal({ redirectUrl: '/cart' });
    } else {
      this.router.navigate(['/cart']);
    }
  }

  goToProfile(): void {
    this.closeMenus();
    if (!this.isLoggedIn()) {
      this.authModalService.openModal({ redirectUrl: '/profile' });
      return;
    }
    this.router.navigate(['/profile']);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenus();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target?.closest('.cat-dropdown') ||
      target?.closest('.user-dropdown') ||
      target?.closest('.menu-btn') ||
      target?.closest('.nav-right') ||
      target?.closest('.search')
    ) {
      return;
    }
    this.closeMenus();
    this.closeDropdown();
  }
}
