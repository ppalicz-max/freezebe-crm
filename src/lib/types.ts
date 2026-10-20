export const TYPES = ['Hotel', 'Bar', 'Restaurant', 'Sport', 'Leisure', 'Children', 'Other'] as const;
export const STAGES = ['lead', 'contacted', 'tasting', 'negotiating', 'customer', 'lost'] as const;
export const ACTS = ['call', 'visit', 'email', 'tasting', 'note'] as const;

export type ClientType = (typeof TYPES)[number];
export type Stage = (typeof STAGES)[number];
export type ActivityType = (typeof ACTS)[number];
export type Role = 'owner' | 'rep';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  stage: Stage;
  contact: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  website: string;
  nextFollowUp: string; // ISO date or ''
  notes: string;
  createdAt: number;
}

export interface Activity {
  id: string;
  clientId: string;
  type: ActivityType;
  date: string;
  text: string;
  createdAt: number;
}

/** Price and commission are copied onto the line when the order is saved. */
export interface OrderLine {
  productId: string | null;
  name: string;
  qty: number;
  price: number;
  commission: number;
}

export interface Order {
  id: string;
  clientId: string;
  date: string;
  note: string;
  paid: boolean;
  createdAt: number;
  lines: OrderLine[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  commission: number;
  active: boolean;
  sortOrder: number;
}

export interface Catalog {
  currency: string;
  vat: number;
  products: Product[];
}

export interface UserSettings {
  target: number;
  reorderDays: number;
}

export interface Member {
  id: string;
  userId: string | null;
  email: string;
  name: string;
  phone: string;
  position: string;
  segment: string;
  role: Role;
  active: boolean;
}

export interface TeamRow {
  memberId: string;
  repId: string;
  name: string;
  active: boolean;
  clients: number;
  qty: number;
  net: number;
  commission: number;
  unpaid: number;
}
