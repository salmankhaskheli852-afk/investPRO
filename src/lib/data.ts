import { PlaceHolderImages } from "./placeholder-images";

export type InvestmentPlan = {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  totalIncome: number;
  imageUrl: string;
  imageHint: string;
  color: string;
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

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id);

export const investmentPlans: InvestmentPlan[] = [
  {
    id: 'plan-1',
    name: 'Starter Pack',
    price: 100,
    dailyIncome: 2.5,
    totalIncome: 150,
    imageUrl: findImage('plan-starter')?.imageUrl || '',
    imageHint: findImage('plan-starter')?.imageHint || '',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'plan-2',
    name: 'Growth Engine',
    price: 500,
    dailyIncome: 3.0,
    totalIncome: 900,
    imageUrl: findImage('plan-standard')?.imageUrl || '',
    imageHint: findImage('plan-standard')?.imageHint || '',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'plan-3',
    name: 'Premium Yield',
    price: 2000,
    dailyIncome: 3.5,
    totalIncome: 4200,
    imageUrl: findImage('plan-premium')?.imageUrl || '',
    imageHint: findImage('plan-premium')?.imageHint || '',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'plan-4',
    name: 'VIP Portfolio',
    price: 10000,
    dailyIncome: 4.0,
    totalIncome: 24000,
    imageUrl: findImage('plan-vip')?.imageUrl || '',
    imageHint: findImage('plan-vip')?.imageHint || '',
    color: 'from-amber-500 to-amber-600',
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

export const adminWalletDetails = {
    walletName: "USDT (TRC20)",
    name: "InvesPro Holdings",
    number: "TXYZ123ABC789..."
};
