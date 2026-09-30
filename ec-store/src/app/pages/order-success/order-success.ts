import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { OrderService } from '../../core/services/order.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './order-success.html',
  styleUrl: './order-success.css',
})
export class OrderSuccessComponent {
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  readonly order = this.orderService.lastOrder;

  continueShopping(): void {
    this.router.navigate(['/']);
  }
}
