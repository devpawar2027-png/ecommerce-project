export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url?: string;
  is_deleted?: boolean;
  bannerImage?: string;
  tagline?: string;
}
