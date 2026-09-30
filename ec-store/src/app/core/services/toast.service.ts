import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<ToastItem[]>([]);

  show(type: ToastType, title: string, message: string, duration = 4000): void {
    const id = 'toast-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const item: ToastItem = { id, type, title, message, duration };

    this.toasts.update((current) => [...current, item]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  success(title: string, message = '', duration = 3500): void {
    this.show('success', title, message, duration);
  }

  error(title: string, message = '', duration = 5000): void {
    this.show('error', title, message, duration);
  }

  warning(title: string, message = '', duration = 4000): void {
    this.show('warning', title, message, duration);
  }

  info(title: string, message = '', duration = 3500): void {
    this.show('info', title, message, duration);
  }

  remove(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
