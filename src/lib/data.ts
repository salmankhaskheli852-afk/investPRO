import { Timestamp } from "firebase/firestore";

export type PlanCategory = {
  id: string;
  name: string;
  createdAt?: Timestamp;
};

export type InvestmentPlan = {
  id: string;
  name: string;
  price: number;
  dailyIncomePercentage: number;
  incomePeriod: number;
  totalIncome: number;
  imageUrl: string;
  imageHint: string;
  color: string;
  categoryId: string;
  isOfferEnabled?: boolean;
  offerEndTime?: Timestamp | null;
  createdAt: Timestamp;
};

export type AgentPermissions = {
  canViewDepositHistory: boolean;
  canViewWithdrawalHistory: boolean;
  canManageDepositRequests: boolean;
  canManageWithdrawalRequests: boolean;
  canAccessLiveChat: boolean;
}

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  investments: string[]; // array of plan IDs
  agentId: string | null; // Can be null if no agent is assigned
  role: 'user' | 'agent' | 'admin';
  assignedWallets?: string[]; // array of admin wallet IDs
  permissions?: AgentPermissions;
};

export type Wallet = {
    id: string;
    userId: string;
    balance: number;
}

export type Transaction = {
  id:string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'income';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'revoked';
  date: Timestamp;
  details?: any;
};

export type AdminWallet = {
    id: string;
    walletName: string;
    name: string;
    number: string;
    isBank?: boolean;
    isEnabled: boolean;
}

export type WithdrawalMethod = {
    id: string;
    name: string;
    isEnabled: boolean;
}

export type OfferConfig = {
    isEnabled: boolean;
    endTime: Timestamp | null;
}

export type ChatSettings = {
    whatsappNumber?: string;
    whatsappCommunityLink?: string;
    verificationBadgeText?: string;
}

// This is now seed data for Firestore, not used directly in the app.
export const investmentPlans: InvestmentPlan[] = [];
