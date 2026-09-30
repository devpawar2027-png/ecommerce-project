import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar';
import { DbOrder, OrderService, PlacedOrder } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';

export interface EnrichedOrder {
  id: string | number;
  date: string;
  total: number;
  status: string;
  items: {
    product: Product;
    quantity: number;
    price: number;
  }[];
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class OrdersComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  readonly enrichedOrders = signal<EnrichedOrder[]>([]);
  readonly isLoading = signal<boolean>(true);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    const lastOrder = this.orderService.lastOrder();
    const products = this.productService.getProducts();

    this.orderService.fetchUserOrders().subscribe({
      next: (dbOrders: DbOrder[]) => {
        const list: EnrichedOrder[] = [];

        // If there is a last local placed order, present it at top
        if (lastOrder && lastOrder.items && lastOrder.items.length > 0) {
          list.push({
            id: lastOrder.orderId,
            date: lastOrder.date,
            total: lastOrder.totalAmount,
            status: 'Confirmed',
            items: lastOrder.items.map((i) => ({
              product: i.product,
              quantity: i.quantity,
              price: i.product.price,
            })),
          });
        }

        // Map backend orders
        const activeDbOrders = (dbOrders || []).filter((o) => !o.is_deleted);
        if (activeDbOrders.length > 0) {
          activeDbOrders.forEach((dbo) => {
            // Avoid duplicate if same as lastOrder
            const matched = products.find((p) => p.id === dbo.product_id) || {
              id: dbo.product_id,
              name: `Product #${dbo.product_id}`,
              price: dbo.total_price ? dbo.total_price / (dbo.quantity || 1) : 1999,
              quantity: 10,
              details: 'Purchased Item',
              image:
                'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
              brand: 'Verified Store',
              category: 'General',
            };

            list.push({
              id: `ORD-${100000 + dbo.id}`,
              date: 'Recently placed',
              total: dbo.total_price || matched.price * (dbo.quantity || 1),
              status: 'Delivered',
              items: [
                {
                  product: matched,
                  quantity: dbo.quantity || 1,
                  price: matched.price,
                },
              ],
            });
          });
        }

        this.enrichedOrders.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  viewProduct(id: number): void {
    this.router.navigate(['/product-details', id]);
  }
}
