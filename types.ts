
export enum View {
  DASHBOARD = 'DASHBOARD',
  POS = 'POS',
  FINANCE = 'FINANCE',
  INVENTORY = 'INVENTORY',
  STAFF = 'STAFF',
  CUSTOMERS = 'CUSTOMERS',
  SETTINGS = 'SETTINGS'
}

export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
}

export type Language = 'en' | 'ur' | 'fa';

export interface ShopSettings {
  shopName: string;
  currency: string;
  language: Language;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  receiptFooter: string;
  taxRate: number;
  taxType: 'included' | 'excluded';
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
  category: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  barcode?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: UserRole;
  commission: number; // percentage
  username: string;
  password?: string;
  email?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}

export interface DiscountCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
}

export interface SaleItem {
  id: string;
  name: string;
  price: number;
  type: 'service' | 'product';
  quantity: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  items: SaleItem[];
  staffId: string;
  customerId?: string;
  total: number;
  tax: number;
  discount: number;
  discountCode?: string;
  paymentMethod: 'cash' | 'card';
  taxType: 'included' | 'excluded';
}

export interface HeldSale {
  id: string;
  timestamp: string;
  cart: SaleItem[];
  customerId?: string;
  staffId?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}