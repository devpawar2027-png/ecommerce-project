import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { NavbarComponent } from './navbar';
import { AuthService } from '../../core/services/auth.service';
import { CategoryItem, CategoryService } from '../../core/services/category.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let authService: AuthService;
  let router: Router;
  let categoryService: CategoryService;

  const mockCategories: CategoryItem[] = [
    { id: 1, name: 'Electronics', slug: 'electronics', is_deleted: false },
    { id: 2, name: 'Pet Supplies', slug: 'pet-supplies', is_deleted: false },
    { id: 3, name: 'Dev Category', slug: 'dev-category', is_deleted: false },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([
          { path: 'login', component: class {} },
          { path: 'profile', component: class {} },
          { path: 'category/:slug', component: class {} },
        ]),
        provideHttpClient(),
        {
          provide: CategoryService,
          useValue: {
            getCategories: () => of(mockCategories),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    categoryService = TestBed.inject(CategoryService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load categories dynamically on init', () => {
    fixture.detectChanges();
    expect(component.categories.length).toBe(3);
    expect(component.categories[0].name).toBe('Electronics');
    expect(component.categories[1].name).toBe('Pet Supplies');
    expect(component.categories[2].name).toBe('Dev Category');
    expect(component.isLoading).toBe(false);
  });

  it('should render all dynamic categories in category strip', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const catItems = compiled.querySelectorAll('.cat-item');
    expect(catItems.length).toBe(3);

    const labels = Array.from(compiled.querySelectorAll('.cat-label')).map(
      (el) => el.textContent?.trim()
    );
    expect(labels).toEqual(['Electronics', 'Pet Supplies', 'Dev Category']);
  });

  it('should render loading skeleton while categories are loading', () => {
    component.isLoading = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cat-strip-skeleton')).toBeTruthy();
  });

  it('should render empty state when no categories exist', () => {
    component.isLoading = false;
    component.categories = [];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyState = compiled.querySelector('.cat-empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.textContent).toContain('No categories available');
  });

  it('should generate correct slug for routerLink', () => {
    expect(component.getCategorySlug({ id: 1, name: 'Electronics', slug: '' })).toBe('electronics');
    expect(component.getCategorySlug({ id: 2, name: 'Pet Supplies', slug: '' })).toBe('pet-supplies');
    expect(component.getCategorySlug({ id: 3, name: 'Dev Category', slug: '' })).toBe('dev-category');
  });

  it('should have currentUser and isLoggedIn exposed from AuthService', () => {
    expect(component.currentUser).toBe(authService.currentUser);
    expect(component.isLoggedIn).toBe(authService.isLoggedIn);
  });

  it('should navigate to /profile on goToProfile', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.goToProfile();
    expect(navigateSpy).toHaveBeenCalledWith(['/profile']);
  });

  it('should call authService.logout and navigate to /login on logout', () => {
    const logoutSpy = vi.spyOn(authService, 'logout');
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.logout();
    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should render Login button when user is logged out', () => {
    authService.currentUser.set(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.login-btn')).toBeTruthy();
    expect(compiled.querySelector('.user-profile')).toBeNull();
  });

  it('should render user profile avatar, name, and toggle dropdown menu when user is logged in', () => {
    authService.currentUser.set({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      profile_photo: 'assets/images/custom-avatar.png',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.login-btn')).toBeNull();

    const profileEl = compiled.querySelector('.user-profile');
    expect(profileEl).toBeTruthy();

    const avatar = compiled.querySelector('.profile-avatar') as HTMLImageElement;
    expect(avatar).toBeTruthy();
    expect(avatar.getAttribute('src')).toBe('assets/images/custom-avatar.png');

    const nameEl = compiled.querySelector('.user-name');
    expect(nameEl?.textContent?.trim()).toBe('John Doe');

    // Toggle dropdown
    const profileBtn = compiled.querySelector('.user-profile') as HTMLElement;
    profileBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.user-dropdown-menu')).toBeTruthy();
    expect(compiled.querySelector('.dropdown-logout-btn')).toBeTruthy();
  });

  it('should fallback to assets/images/default-user.png if user has no profile_photo', () => {
    authService.currentUser.set({
      id: '2',
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const avatar = compiled.querySelector('.profile-avatar') as HTMLImageElement;
    expect(avatar.getAttribute('src')).toBe('assets/images/default-user.png');
  });

  it('should revert to login button when user logs out', () => {
    authService.currentUser.set({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.user-profile')).toBeTruthy();

    // Trigger logout
    component.logout();
    fixture.detectChanges();

    expect(compiled.querySelector('.user-profile')).toBeNull();
    expect(compiled.querySelector('.login-btn')).toBeTruthy();
  });
});
