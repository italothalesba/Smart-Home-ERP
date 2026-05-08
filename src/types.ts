export enum FinanceType {
  FIXA = 'fixa',
  PARCELADO = 'parcelado',
  EXTRA = 'extra',
  RENEGOCIACAO = 'renegociacao',
}

export interface Income {
  id: string;
  description: string;
  value: number;
  type: 'fixo' | 'volatil';
  ownerId: string;
  date?: string;
}

export enum FinanceStatus {
  PENDENTE = 'pendente',
  PAGO = 'pago',
}

export enum MealType {
  CAFE = 'cafe',
  ALMOCO = 'almoco',
  LANCHE = 'lanche',
  JANTAR = 'jantar',
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  budget: number;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  price: number;
  quantity: number;
  category: string;
  unit: string;
  minStock: number;
  updatedAt: string;
  lastPurchasedAt?: string;
}

export interface MarketItem {
  id: string;
  productId: string;
  name: string;
  brand?: string;
  marketName?: string;
  quantity: number;
  unit: string;
  price: number;
  addedAt: string;
  checked?: boolean;
}

export interface Market {
  id: string;
  name: string;
  location?: string;
  contributorId?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  brands: string[];
  marketPrices: {
    [marketName: string]: {
      price: number;
      updatedAt: string;
      brand?: string;
    }
  };
  lastUpdateBy?: string;
}

export interface Finance {
  id: string;
  description: string;
  type: FinanceType;
  value: number;
  totalInstallments?: number;
  currentInstallment?: number;
  displayInstallment?: number;
  status: FinanceStatus;
  paidMonths?: string[];
  dueDate: string;
  startDate?: string;
  endDate?: string;
  ownerId: string;
}

export interface MealIngredient {
  productId?: string;
  name: string;
  amountPerPerson: number;
  unit: string;
}

export interface Meal {
  id: string;
  day: string;
  type: MealType;
  title: string;
  ingredients: string[];
  structuredIngredients?: MealIngredient[];
  instructions?: string;
  peopleCount?: number;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  weeklyKgConsumption: number;
  kgPrice: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}
