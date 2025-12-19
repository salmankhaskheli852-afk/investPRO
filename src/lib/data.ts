import { PlaceHolderImages } from "./placeholder-images";

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
  walletBalance: number;
  investments: string[]; // array of plan IDs
  agentId?: string;
};

export type Agent = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  managedUserIds: string[];
};

export type Transaction = {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'investment';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
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

export const investmentPlans: InvestmentPlan[] = [
  {
    id: 'plan-1',
    name: 'Starter Pack',
    price: 1580,
    dailyIncome: 65,
    incomePeriod: 60,
    totalIncome: 150,
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
    totalIncome: 900,
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
    totalIncome: 4200,
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
    incomePeriod: 60, // Assuming a value
    totalIncome: 24000,
    imageUrl: findImage('plan-vip')?.imageUrl || '',
    imageHint: findImage('plan-vip')?.imageHint || '',
    color: 'from-amber-500 to-amber-600',
    categoryId: 'cat-2',
  },
];

export const users: User[] = [
  {
    id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatarUrl: findImage('user-avatar-1')?.imageUrl || '',
    walletBalance: 1250.75,
    investments: ['plan-1'],
    agentId: 'agent-1',
  },
  {
    id: 'user-2',
    name: 'Bob Williams',
    email: 'bob@example.com',
    avatarUrl: findImage('user-avatar-2')?.imageUrl || '',
    walletBalance: 340.00,
    investments: [],
    agentId: 'agent-1',
  },
  {
    id: 'user-3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    avatarUrl: findImage('user-avatar-3')?.imageUrl || '',
    walletBalance: 5600.00,
    investments: ['plan-1', 'plan-2'],
    agentId: 'agent-2',
  },
];

export const agents: Agent[] = [
  {
    id: 'agent-1',
    name: 'David Miller',
    email: 'david.agent@invespro.com',
    avatarUrl: findImage('user-avatar-4')?.imageUrl || '',
    managedUserIds: ['user-1', 'user-2'],
  },
  {
    id: 'agent-2',
    name: 'Eve Davis',
    email: 'eve.agent@invespro.com',
    avatarUrl: findImage('user-avatar-1')?.imageUrl || '',
    managedUserIds: ['user-3'],
  },
];

export const transactions: Transaction[] = [
    { id: 'txn-1', userId: 'user-1', type: 'deposit', amount: 500, status: 'completed', date: '2023-10-01' },
    { id: 'txn-2', userId: 'user-1', type: 'investment', amount: 100, status: 'completed', date: '2023-10-02' },
    { id: 'txn-3', userId: 'user-2', type: 'deposit', amount: 1000, status: 'completed', date: '2023-10-03' },
    { id: 'txn-4', userId: 'user-3', type: 'withdrawal', amount: 200, status: 'pending', date: '2023-10-04' },
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
