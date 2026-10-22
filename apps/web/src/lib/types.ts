// Response shapes of the Express API (apps/api). Money arrives as fixed-point strings ("3.250").

export type OptionValue = { id: string; name: string; priceDelta: string; isDefault: boolean; isAvailable?: boolean };
export type ItemOption = { id: string; name: string; minSelect: number; maxSelect: number; values: OptionValue[] };

export type MenuItem = {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  liquidColor: string | null;
  layerColor: string | null;
  basePrice: string;
  isFeatured: boolean;
  isSeasonal: boolean;
  isAvailable: boolean;
  sortOrder: number;
  options: ItemOption[];
  isActive?: boolean;
  updatedAt?: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  liquidColor: string | null;
  layerColor: string | null;
  items: MenuItem[];
};

export type PublicSettings = {
  brandName: string;
  heroHeading: string;
  heroSubheading: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  storyHeading: string | null;
  storyBody: string | null;
  announcement: string | null;
  currencyCode: string;
  instagramUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  mapUrl: string | null;
  openingHours: string | null;
  orderInstructions: string | null;
  policyText: string | null;
  seoTitle: string;
  seoDescription: string;
  acceptingOrders: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: string;
  payAtPickupEnabled: boolean;
};

export type AdminSettings = PublicSettings & { timezone: string | null; updatedAt: string };

export type Quote = {
  currencyCode: string;
  lines: { menuItemId: string; name: string; options: { option: string; value: string; priceDelta: string }[]; unitPrice: string; quantity: number; lineTotal: string }[];
  subtotal: string;
  discountTotal: string;
  deliveryFee: string;
  total: string;
};

export type OrderStatus = "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

export type OrderDetail = {
  id?: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "PAY_AT_PICKUP";
  fulfilment: "PICKUP" | "DELIVERY";
  customerName: string;
  customerPhone?: string;
  customerEmail?: string | null;
  deliveryAddress?: string | null;
  notes: string | null;
  currencyCode: string;
  subtotal: string;
  discountTotal: string;
  deliveryFee: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  items: { id: string; menuItemId: string | null; name: string; imageUrl: string | null; options: { option: string; value: string; priceDelta: string }[]; unitPrice: string; quantity: number; lineTotal: string }[];
  events: { fromStatus: OrderStatus | null; toStatus: OrderStatus; createdAt: string; by?: string | null; note?: string | null }[];
};

export type ApiErrorBody = { error: string; details?: { line?: number; path?: string; message: string }[] };

// ---- admin ----
export type AdminOrderRow = {
  id: string;
  reference: string;
  customerName: string;
  fulfilment: "PICKUP" | "DELIVERY";
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: string;
  currencyCode: string;
  itemCount: number;
  createdAt: string;
};
export type OrderList = { total: number; page: number; pageSize: number; orders: AdminOrderRow[] };

export type Overview = {
  currencyCode: string;
  timezone: string;
  timezoneConfirmed: boolean;
  today: { orders: number; value: string };
  awaitingAction: number;
  soldOut: { id: string; name: string }[];
  recent: { id: string; reference: string; customerName: string; status: OrderStatus; total: string; createdAt: string; fulfilment: string }[];
  topItems: { name: string; quantity: number; value: string }[];
  trend: { day: string; orders: number; value: string }[];
};

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  liquidColor: string | null;
  layerColor: string | null;
  sortOrder: number;
  isActive: boolean;
  itemCount: number;
};
