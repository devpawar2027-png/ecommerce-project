import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AdminAuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent {
  readonly authService = inject(AdminAuthService);
  private readonly router = inject(Router);

  sidebarCollapsed = signal<boolean>(false);
  mobileSidebarOpen = signal<boolean>(false);
  currentRoute = signal<string>('Dashboard');

  readonly currentAdmin = this.authService.currentAdmin;

  constructor() {
    this.updateRouteTitle(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateRouteTitle(event.urlAfterRedirects || event.url);
        this.mobileSidebarOpen.set(false); // Close sidebar on mobile route change
      });
  }

  toggleSidebar(): void {
    if (window.innerWidth < 992) {
      this.mobileSidebarOpen.update((v) => !v);
    } else {
      this.sidebarCollapsed.update((v) => !v);
    }
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  private updateRouteTitle(url: string): void {
    const cleanUrl = url.split('?')[0];
    if (cleanUrl.includes('categories')) this.currentRoute.set('Categories');
    else if (cleanUrl.includes('subcategories')) this.currentRoute.set('SubCategories');
    else if (cleanUrl.includes('brands')) this.currentRoute.set('Brands');
    else if (cleanUrl.includes('products')) this.currentRoute.set('Products');
    else if (cleanUrl.includes('orders')) this.currentRoute.set('Orders');
    else if (cleanUrl.includes('users')) this.currentRoute.set('Users');
    else this.currentRoute.set('Dashboard');
  }
}
