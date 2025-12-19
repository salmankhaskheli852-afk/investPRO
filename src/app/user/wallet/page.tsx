'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminWalletDetails } from '@/lib/data';
import { ArrowDownToLine, ArrowUpFromLine, Copy } from 'lucide-react';
import React from 'react';

export default function UserWalletPage() {
  const [activeTab, setActiveTab] = React.useState('deposit');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
        <p className="text-muted-foreground">Manage your funds, deposit, and withdraw.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Select an option to manage your funds.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-4">
                <Button 
                    size="lg" 
                    onClick={() => setActiveTab('deposit')}
                    className={activeTab === 'deposit' ? 'bg-primary hover:bg-primary/90' : ''}
                    variant={activeTab === 'deposit' ? 'default' : 'outline'}
                >
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Deposit
                </Button>
                <Button 
                    size="lg" 
                    onClick={() => setActiveTab('withdraw')}
                    className={activeTab === 'withdraw' ? 'bg-primary hover:bg-primary/90' : ''}
                    variant={activeTab === 'withdraw' ? 'default' : 'outline'}
                >
                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                    Withdraw
                </Button>
            </div>
        </CardContent>
      </Card>
        
      {activeTab === 'deposit' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Deposit Funds</CardTitle>
              <CardDescription>
                To deposit funds, please send the amount to the following wallet address. Your balance will be updated upon confirmation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Wallet</Label>
                <p className="font-semibold text-primary">{adminWalletDetails.walletName}</p>
              </div>
               <div className="space-y-1">
                <Label>Recipient Name</Label>
                <p className="font-semibold">{adminWalletDetails.name}</p>
              </div>
              <div className="space-y-1">
                <Label>Wallet Address</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={adminWalletDetails.number} className="bg-muted" />
                  <Button variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">
                    Important: Only send {adminWalletDetails.walletName} to this address. Sending any other currency may result in the loss of your deposit.
                </p>
            </CardFooter>
          </Card>
      )}

      {activeTab === 'withdraw' && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>
                Enter your withdrawal details below. Requests are processed within 24 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (PKR)</Label>
                <Input id="amount" type="number" placeholder="e.g., 500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wallet-name">Wallet Name</Label>
                <Input id="wallet-name" placeholder="e.g., USDT (TRC20)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wallet-address">Your Wallet Address</Label>
                <Input id="wallet-address" placeholder="Enter your receiving address" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-accent hover:bg-accent/90">Submit Withdrawal Request</Button>
            </CardFooter>
          </Card>
      )}
    </div>
  );
}
