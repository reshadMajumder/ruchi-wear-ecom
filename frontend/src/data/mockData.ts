
export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  description?: string;
  badges?: string[];
  soldCount?: number | string;
  warranty?: string;
  hasEMI?: boolean;
  discountAmount?: number;
  discountPercent?: number;
}

const DEFAULT_DESCRIPTION = "This premium product offers exceptional quality and performance. Designed with the modern user in mind, it combines sleek aesthetics with robust functionality to deliver an unparalleled experience in its category.";

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Electronics', image: 'https://picsum.photos/seed/11/150/150' },
  { id: '2', name: 'Fashion', image: 'https://picsum.photos/seed/12/150/150' },
  { id: '3', name: 'Home', image: 'https://picsum.photos/seed/13/150/150' },
  { id: '4', name: 'Beauty', image: 'https://picsum.photos/seed/14/150/150' },
  { id: '5', name: 'Sports', image: 'https://picsum.photos/seed/15/150/150' },
  { id: '6', name: 'Toys', image: 'https://picsum.photos/seed/16/150/150' },
  { id: '7', name: 'Grocery', image: 'https://picsum.photos/seed/17/150/150' },
  { id: '8', name: 'Automotive', image: 'https://picsum.photos/seed/18/150/150' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Samsung Galaxy A07 4GB RAM 64GB ROM (Best Price)',
    price: 14299,
    originalPrice: 15299,
    image: 'https://picsum.photos/seed/phone1/400/400',
    category: 'Smartphone',
    rating: 0,
    reviews: 0,
    soldCount: 71,
    warranty: '1 YEAR',
    hasEMI: true,
    discountAmount: 1000,
    discountPercent: 7,
    description: "Samsung Galaxy A07 featuring 4GB RAM and 64GB storage.",
  },
  {
    id: 'p2',
    name: 'Samsung Galaxy Tab A11 LTE 4/64 GB (Best Price)',
    price: 22399,
    originalPrice: 23599,
    image: 'https://picsum.photos/seed/tab1/400/400',
    category: 'Smartphone',
    rating: 0,
    reviews: 0,
    soldCount: 25,
    warranty: '1 YEAR',
    hasEMI: true,
    discountAmount: 1200,
    discountPercent: 5,
    description: "Samsung Galaxy Tab A11 LTE version.",
  },
  {
    id: 'p3',
    name: 'Samsung Galaxy Tab A11 WiFi 4/64 GB (Best Price)',
    price: 18499,
    originalPrice: 19499,
    image: 'https://picsum.photos/seed/tab2/400/400',
    category: 'Smartphone',
    rating: 0,
    reviews: 0,
    soldCount: 36,
    warranty: '1 YEAR',
    hasEMI: true,
    discountAmount: 1000,
    discountPercent: 5,
    description: "Samsung Galaxy Tab A11 WiFi version.",
  },
  {
    id: 'p4',
    name: 'Samsung Galaxy S25 FE 8GB RAM 256GB ROM (Best Price)',
    price: 99999,
    originalPrice: 99999,
    image: 'https://picsum.photos/seed/phone2/400/400',
    category: 'Smartphone',
    rating: 0,
    reviews: 0,
    soldCount: 40,
    warranty: '1 YEAR',
    hasEMI: true,
    description: "Samsung Galaxy S25 FE premium flagship.",
  },
];

export const ALL_PRODUCTS = [...PRODUCTS];

export const HOT_DEALS_LARGE: Product[] = [
  {
    id: 'hdl1',
    name: 'Philips 3.2L 1000 Series Air Fryer (NA110/00)',
    price: 5625,
    originalPrice: 13990,
    image: 'https://picsum.photos/seed/airfryer/400/400',
    category: 'Kitchen',
    rating: 5.0,
    reviews: 4,
    description: DEFAULT_DESCRIPTION,
  },
  {
    id: 'hdl2',
    name: 'VISION Blender VIS-SBL-023-1200W (KM 4 in 1) Multi Color',
    price: 6205,
    originalPrice: 7300,
    image: 'https://picsum.photos/seed/blender/400/400',
    category: 'Kitchen',
    rating: 5.0,
    reviews: 12,
    description: DEFAULT_DESCRIPTION,
  }
];

export const HOT_DEALS_SMALL: Product[] = [
  {
    id: 'hds1',
    name: 'Haier 43" QLED 4K Google TV with Dolby Audio...',
    price: 35890,
    originalPrice: 47900,
    image: 'https://picsum.photos/seed/tv/400/400',
    category: 'Electronics',
    rating: 0,
    reviews: 0,
    description: DEFAULT_DESCRIPTION,
  },
  {
    id: 'hds2',
    name: 'VISION Royal Ceiling Fan 56"',
    price: 4604,
    originalPrice: 4950,
    image: 'https://picsum.photos/seed/fan/400/400',
    category: 'Home',
    rating: 0,
    reviews: 0,
    description: DEFAULT_DESCRIPTION,
  }
];

export const TRENDING_PRODUCTS: Product[] = [
  {
    id: 'tp1',
    name: 'Premium Leather Office Chair - Ergonomic Design',
    price: 18500,
    originalPrice: 22000,
    image: 'https://picsum.photos/seed/chair/400/400',
    category: 'Furniture',
    rating: 4.9,
    reviews: 45,
    description: DEFAULT_DESCRIPTION,
  }
];

export const ALL_DATA_PRODUCTS = [
  ...PRODUCTS,
  ...HOT_DEALS_LARGE,
  ...HOT_DEALS_SMALL,
  ...TRENDING_PRODUCTS
];
