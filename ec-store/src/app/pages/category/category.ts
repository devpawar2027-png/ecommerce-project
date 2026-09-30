import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { CategoryItem, CategoryService } from '../../core/services/category.service';
import { SubCategoryItem, SubCategoryService } from '../../core/services/subcategory.service';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './category.html',
  styleUrl: './category.css',
})
export class CategoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoryService = inject(CategoryService);
  private readonly subcategoryService = inject(SubCategoryService);
  private readonly productService = inject(ProductService);

  readonly category = signal<CategoryItem | undefined>(undefined);
  readonly subcategories = signal<SubCategoryItem[]>([]);
  readonly featuredProducts = signal<Product[]>([]);
  readonly isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug')?.toLowerCase().trim() ?? '';
      this.loadCategoryAndSubcategories(slug);
    });
  }

  loadCategoryAndSubcategories(slug: string): void {
    this.isLoading.set(true);

    forkJoin({
      categories: this.categoryService.getCategories().pipe(catchError(() => of([]))),
      subcategories: this.subcategoryService.getSubCategories().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ categories, subcategories }) => {
        // Find matching category by slug, name, or numeric id
        const found = categories.find(
          (c) =>
            this.getSlug(c.name) === slug ||
            String(c.id) === slug ||
            (c.slug && c.slug.toLowerCase() === slug)
        );

        this.category.set(found);

        if (found) {
          // Filter subcategories belonging to this category
          const related = (subcategories || []).filter(
            (s) => s.category_id === found.id && !s.is_deleted
          );
          this.subcategories.set(related);

          // Fetch products matching this category
          const prods = this.productService.getProductsByCategory(this.getSlug(found.name));
          this.featuredProducts.set(prods.slice(0, 4));
        } else {
          this.subcategories.set([]);
          this.featuredProducts.set([]);
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load category and subcategories:', err);
        this.category.set(undefined);
        this.subcategories.set([]);
        this.featuredProducts.set([]);
        this.isLoading.set(false);
      },
    });
  }

  goToSubcategory(sub: SubCategoryItem): void {
    const cat = this.category();
    if (!cat) return;
    const catSlug = this.getSlug(cat.name);
    const subSlug = this.getSlug(sub.name);
    this.router.navigate(['/products', catSlug, subSlug]);
  }

  goToProduct(id: number): void {
    this.router.navigate(['/product-details', id]);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  getSlug(name: string): string {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  getCategoryBanner(cat: CategoryItem): string {
    if (cat.bannerImage) return cat.bannerImage;
    const n = cat.name.toLowerCase();
    if (n.includes('electr') || n.includes('tech') || n.includes('laptop')) {
      return 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80';
    }
    if (n.includes('mob') || n.includes('phone')) {
      return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80';
    }
    if (n.includes('pet')) {
      return 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80';
    }
    if (n.includes('fash') || n.includes('cloth')) {
      return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80';
    }
    if (n.includes('beauty') || n.includes('care')) {
      return 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80';
    }
    return 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80';
  }

  getCategoryTagline(cat: CategoryItem): string {
    if (cat.tagline) return cat.tagline;
    return `Discover bestselling products, top verified brands, and special offers in ${cat.name}.`;
  }

  getSubcategoryImage(sub: SubCategoryItem): string {
    if (sub.image) return sub.image;
    const n = sub.name.toLowerCase();
    if (n.includes('laptop') || n.includes('macbook')) {
      return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80';
    }
    if (n.includes('phone') || n.includes('mobile') || n.includes('smartphone')) {
      return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80';
    }
    if (n.includes('headphone') || n.includes('earphone') || n.includes('audio')) {
      return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80';
    }
    if (n.includes('watch') || n.includes('smartwatch')) {
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80';
    }
    if (n.includes('shoe') || n.includes('sneaker') || n.includes('footwear')) {
      return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80';
    }
    if (n.includes('dog') || n.includes('cat') || n.includes('food') || n.includes('pet')) {
      return 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=500&q=80';
    }
    return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=500&q=80';
  }

  getSubcategoryDescription(sub: SubCategoryItem): string {
    if (sub.description) return sub.description;
    return `Explore top rated ${sub.name} with express delivery and official warranty.`;
  }

  getSubcategoryOffer(sub: SubCategoryItem): string {
    return sub.offer || 'Up to 30% Off';
  }

  getSubcategoryItemCount(sub: SubCategoryItem): string {
    return sub.itemCount || 'In Stock';
  }
}
