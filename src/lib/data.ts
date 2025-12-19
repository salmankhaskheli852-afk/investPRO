
import { Timestamp } from "firebase/firestore";

export type PlanCategory = {
  id: string;
  name: string;
  createdAt?: Timestamp;
};

export type InvestmentPlan = {
  id: string;
  name:string;
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
  purchaseLimit?: number; // 0 or undefined for unlimited
  purchaseCount?: number;
};

export type AgentPermissions = {
  canViewDepositHistory: boolean;
  canViewWithdrawalHistory: boolean;
  canManageDepositRequests: boolean;
  canManageWithdrawalRequests: boolean;
  canAccessLiveChat: boolean;
  canViewAllUsers?: boolean;
}

export type UserInvestment = {
    planId: string;
    purchaseDate: Timestamp;
}

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  investments: UserInvestment[]; // array of user investment objects
  agentId: string | null; // Can be null if no agent is assigned
  role: 'user' | 'agent' | 'admin';
  assignedWallets?: string[]; // array of admin wallet IDs
  permissions?: AgentPermissions;
  referralId: string; // User's own referral ID (same as user ID)
  referrerId?: string; // The ID of the user who referred them
  referralCount?: number;
  referralIncome?: number;
  createdAt: Timestamp;
  isVerified?: boolean;
};

export type Wallet = {
    id: string;
    userId: string;
    balance: number;
}

export type Transaction = {
  id:string;
  walletId: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'income' | 'referral_income';
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

export type UserWithdrawalAccount = {
    id: string;
    userId: string;
    method: 'Easypaisa' | 'JazzCash' | 'Bank';
    accountHolderName: string;
    accountNumber: string;
    bankName?: string;
    createdAt: Timestamp;
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

export type AppSettings = {
    whatsappNumber?: string;
    whatsappCommunityLink?: string;
    verificationBadgeText?: string;
    minDeposit?: number;
    maxDeposit?: number;
    minWithdrawal?: number;
    maxWithdrawal?: number;
    baseInvitationUrl?: string;
    referralCommissionPercentage?: number;
    userMaintenanceMode?: boolean;
    userMaintenanceMessage?: string;
    agentMaintenanceMode?: boolean;
    agentMaintenanceMessage?: string;
    isVerificationEnabled?: boolean;
    verificationPopupTitle?: string;
    verificationPopupMessage?: string;
    verificationDepositAmount?: number;
}

// This is now seed data for Firestore, not used directly in the app.
export const investmentPlans: InvestmentPlan[] = [];

// This is now seed data for Firestore, not used directly in the app.
export const planCategories: PlanCategory[] = [
    { id: 'short-term', name: 'Short Term' },
    { id: 'long-term', name: 'Long Term' },
    { id: 'vip', name: 'VIP' },
  ];
