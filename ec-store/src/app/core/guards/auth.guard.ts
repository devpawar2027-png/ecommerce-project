import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthModalService } from '../services/auth-modal.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const authModalService = inject(AuthModalService);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Open the premium authentication modal for unauthenticated guest attempts
  authModalService.openModal({
    redirectUrl: state.url,
  });

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
