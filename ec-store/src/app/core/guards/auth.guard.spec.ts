import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { AuthModalService } from '../services/auth-modal.service';

describe('authGuard', () => {
  let authService: AuthService;
  let authModalService: AuthModalService;
  let router: Router;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/cart' } as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        AuthModalService,
        provideHttpClient(),
      ],
    });
    authService = TestBed.inject(AuthService);
    authModalService = TestBed.inject(AuthModalService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should allow access when user is logged in', () => {
    authService.currentUser.set({ id: '1', name: 'Test User', email: 'test@example.com' });

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBe(true);
  });

  it('should block access, open modal, and redirect to login when user is guest', () => {
    authService.currentUser.set(null);
    const openModalSpy = vi.spyOn(authModalService, 'openModal');

    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));

    expect(openModalSpy).toHaveBeenCalledWith({ redirectUrl: '/cart' });
    expect(result).not.toBe(true);
  });
});
