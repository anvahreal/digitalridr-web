export interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  images: string[];
  amenities: string[];
  host_id: string;
  host_name: string;
  host_avatar?: string;
  host_logo?: string | null;
  rating: number;
  review_count: number;
  is_superhost: boolean;
  created_at: string;
  latitude?: number;
  longitude?: number;
  content_type?: string;
  video_url?: string;
  house_rules?: string[];
  security_deposit?: number;
}

export interface SearchFilters {
  location: string;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
  priceMin: number;
  priceMax: number;
  bedrooms: number;
  propertyType: string;
  amenities?: string[];
}

export interface Booking {
  id: string;
  listing_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

export interface Review {
  id: string;
  listing_id: string;
  guest_id: string;
  guest_name: string;
  guest_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_host: boolean;
  host_status?: 'pending' | 'approved' | 'rejected' | 'none';
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_admin?: boolean;
  created_at: string;
}
