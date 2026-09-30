export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  details: string;
  brand_id?: number;
  image_url?: string;
  is_deleted?: boolean;

  // Derived / UI fields
  brand?: string;
  category?: string;
  categorySlug?: string;
  subcategory?: string;
  subcategorySlug?: string;
  image?: string;
  images?: string[];
  oldPrice?: number;
  discount?: number;
  rating?: number;
  reviews?: number;
  stock?: boolean;
  stockCount?: number;
  description?: string;
  features?: string[];
  specifications?: Record<string, string>;
  wished?: boolean;
}
