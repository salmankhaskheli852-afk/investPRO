import { PlaceHolderImages } from "./placeholder-images";
import { Timestamp } from "firebase/firestore";

export type PlanCategory = {
  id: string;
  name: string;
};

export type InvestmentPlan = {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  incomePeriod: number;
  totalIncome: number;
  imageUrl: string;
  imageHint: string;
  color: string;
  categoryId: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  investments: string[]; // array of plan IDs
  agentId?: string;
};

export type Wallet = {
    id: string;
    userId: string;
    balance: number;
}

export type Transaction = {
  id: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'income';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: Timestamp;
  details?: any;
};

export type AdminWallet = {
    id: string;
    walletName: string;
    name: string;
    number: string;
    isBank?: boolean;
}

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id);

export const planCategories: PlanCategory[] = [
    { id: 'cat-1', name: 'Standard' },
    { id: 'cat-2', name: 'Premium' },
];

// This is now seed data for Firestore, not used directly in the app.
export const investmentPlans: InvestmentPlan[] = [
  {
    id: 'plan-1',
    name: 'Starter Pack',
    price: 1580,
    dailyIncome: 65,
    incomePeriod: 60,
    totalIncome: 65 * 60,
    imageUrl: findImage('plan-starter')?.imageUrl || '',
    imageHint: findImage('plan-starter')?.imageHint || '',
    color: 'from-blue-500 to-blue-600',
    categoryId: 'cat-1',
  },
  {
    id: 'plan-2',
    name: 'Growth Engine',
    price: 3160,
    dailyIncome: 190,
    incomePeriod: 62,
    totalIncome: 190 * 62,
    imageUrl: findImage('plan-standard')?.imageUrl || '',
    imageHint: findImage('plan-standard')?.imageHint || '',
    color: 'from-green-500 to-green-600',
    categoryId: 'cat-1',
  },
  {
    id: 'plan-3',
    name: 'Premium Yield',
    price: 11800,
    dailyIncome: 850,
    incomePeriod: 57,
    totalIncome: 850 * 57,
    imageUrl: findImage('plan-premium')?.imageUrl || '',
    imageHint: findImage('plan-premium')?.imageHint || '',
    color: 'from-purple-500 to-purple-600',
    categoryId: 'cat-2',
  },
  {
    id: 'plan-4',
    name: 'VIP Portfolio',
    price: 31800,
    dailyIncome: 2353,
    incomePeriod: 60,
    totalIncome: 2353 * 60,
    imageUrl: findImage('plan-vip')?.imageUrl || '',
    imageHint: findImage('plan-vip')?.imageHint || '',
    color: 'from-amber-500 to-amber-600',
    categoryId: 'cat-2',
  },
];


export const adminWallets: AdminWallet[] = [
    {
        id: 'wallet-1',
        walletName: "Easypaisa",
        name: "you",
        number: "03087554721"
    },
    {
        id: 'wallet-2',
        walletName: "JazzCash",
        name: "salman shop",
        number: "03433273391"
    },
    {
      id: 'wallet-3',
      walletName: 'Bank',
      name: 'Meezan Bank',
      number: '0308237554721',
      isBank: true
    }
];
