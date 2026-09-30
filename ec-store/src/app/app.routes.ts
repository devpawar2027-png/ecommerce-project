import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home';
import { LoginComponent as UserLoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { adminGuard } from './admin/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public Storefront Routes
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  {
    path: 'category/:slug',
    loadComponent: () =>
      import('./pages/category/category').then((m) => m.CategoryComponent),
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products/products').then((m) => m.ProductsComponent),
  },
  {
    path: 'products/:category/:subcategory',
    loadComponent: () =>
      import('./pages/products/products').then((m) => m.ProductsComponent),
  },
  {
    path: 'products/:category',
    loadComponent: () =>
      import('./pages/products/products').then((m) => m.ProductsComponent),
  },
  {
    path: 'product-details/:id',
    loadComponent: () =>
      import('./pages/product-details/product-details').then(
        (m) => m.ProductDetailsComponent
      ),
  },
  {
    path: 'product/:id',
    redirectTo: 'product-details/:id',
    pathMatch: 'full',
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./pages/cart/cart').then((m) => m.CartComponent),
    canActivate: [authGuard],
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/checkout/checkout').then((m) => m.CheckoutComponent),
    canActivate: [authGuard],
  },
  {
    path: 'order-success',
    loadComponent: () =>
      import('./pages/order-success/order-success').then(
        (m) => m.OrderSuccessComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./pages/orders/orders').then((m) => m.OrdersComponent),
    canActivate: [authGuard],
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./pages/wishlist/wishlist').then((m) => m.WishlistComponent),
    canActivate: [authGuard],
  },
  { path: 'login', component: UserLoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile').then((m) => m.ProfileComponent),
    canActivate: [authGuard],
  },

  // Admin Authentication
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/login/login').then((m) => m.LoginComponent),
  },

  // Admin Portal Layout & Child Routes (Protected by adminGuard)
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin-layout/admin-layout').then(
        (m) => m.AdminLayoutComponent
      ),
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./admin/dashboard/dashboard').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./admin/categories/categories').then(
            (m) => m.CategoriesComponent
          ),
      },
      {
        path: 'categories/create',
        loadComponent: () =>
          import('./admin/categories/category-form/category-form').then(
            (m) => m.CategoryFormComponent
          ),
      },
      {
        path: 'categories/edit/:id',
        loadComponent: () =>
          import('./admin/categories/category-form/category-form').then(
            (m) => m.CategoryFormComponent
          ),
      },
      {
        path: 'subcategories',
        loadComponent: () =>
          import('./admin/subcategories/subcategories').then(
            (m) => m.SubcategoriesComponent
          ),
      },
      {
        path: 'subcategories/create',
        loadComponent: () =>
          import('./admin/subcategories/subcategory-form/subcategory-form').then(
            (m) => m.SubcategoryFormComponent
          ),
      },
      {
        path: 'subcategories/edit/:id',
        loadComponent: () =>
          import('./admin/subcategories/subcategory-form/subcategory-form').then(
            (m) => m.SubcategoryFormComponent
          ),
      },
      {
        path: 'brands',
        loadComponent: () =>
          import('./admin/brands/brands').then((m) => m.BrandsComponent),
      },
      {
        path: 'brands/create',
        loadComponent: () =>
          import('./admin/brands/brand-form/brand-form').then(
            (m) => m.BrandFormComponent
          ),
      },
      {
        path: 'brands/edit/:id',
        loadComponent: () =>
          import('./admin/brands/brand-form/brand-form').then(
            (m) => m.BrandFormComponent
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./admin/products/products').then(
            (m) => m.ProductsComponent
          ),
      },
      {
        path: 'products/create',
        loadComponent: () =>
          import('./admin/products/product-form/product-form').then(
            (m) => m.ProductFormComponent
          ),
      },
      {
        path: 'products/edit/:id',
        loadComponent: () =>
          import('./admin/products/product-form/product-form').then(
            (m) => m.ProductFormComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./admin/orders/orders').then((m) => m.OrdersComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./admin/users/users').then((m) => m.UsersComponent),
      },
    ],
  },

  // Wildcard Fallback
  { path: '**', redirectTo: '' },
];