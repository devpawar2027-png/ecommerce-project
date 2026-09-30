import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthModalService } from './auth-modal.service';

describe('AuthModalService', () => {
  let service: AuthModalService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthModalService,
        provideRouter([
          { path: 'login', component: class {} },
          { path: 'register', component: class {} },
          { path: 'cart', component: class {} },
        ]),
      ],
    });
    service = TestBed.inject(AuthModalService);
    router = TestBed.inject(Router);
  });

  it('should be created and closed by default', () => {
    expect(service).toBeTruthy();
    expect(service.isOpen()).toBe(false);
  });

  it('should open modal with default title and message', () => {
    service.openModal();
    expect(service.isOpen()).toBe(true);
    expect(service.modalTitle()).toBe('Login Required');
    expect(service.modalMessage()).toContain('Please login to continue shopping');
  });

  it('should open modal with custom options', () => {
    service.openModal({
      title: 'Custom Title',
      message: 'Custom Message',
      redirectUrl: '/cart',
    });
    expect(service.isOpen()).toBe(true);
    expect(service.modalTitle()).toBe('Custom Title');
    expect(service.modalMessage()).toBe('Custom Message');
    expect(service.redirectUrl()).toBe('/cart');
  });

  it('should close modal when closeModal is called', () => {
    service.openModal();
    expect(service.isOpen()).toBe(true);
    service.closeModal();
    expect(service.isOpen()).toBe(false);
  });

  it('should navigate to login preserving returnUrl', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    service.openModal({ redirectUrl: '/checkout' });
    service.goToLogin();

    expect(service.isOpen()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/checkout' },
    });
  });

  it('should navigate to register preserving returnUrl', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    service.openModal({ redirectUrl: '/cart' });
    service.goToRegister();

    expect(service.isOpen()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/register'], {
      queryParams: { returnUrl: '/cart' },
    });
  });

  it('should trigger callback and navigate on authenticated', () => {
    const navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl');
    let callbackExecuted = false;

    service.openModal({
      redirectUrl: '/wishlist',
      onAuthenticated: () => {
        callbackExecuted = true;
      },
    });

    service.onAuthenticated();

    expect(service.isOpen()).toBe(false);
    expect(callbackExecuted).toBe(true);
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/wishlist');
  });
});
