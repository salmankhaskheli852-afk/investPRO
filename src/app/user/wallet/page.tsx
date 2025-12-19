'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { adminWallets } from '@/lib/data';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                        size="lg"
                        variant={activeTab === 'deposit' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('deposit')}
                        className={activeTab === 'deposit' ? 'bg-primary hover:bg-primary/90' : ''}
                    >
                        <ArrowDownToLine className="mr-2 h-4 w-4" />
                        Deposit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Deposit Funds</DialogTitle>
                      <DialogDescription>
                        Send funds to an account below and enter the details to verify.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label>Select Admin Account</Label>
                        <RadioGroup defaultValue={adminWallets[0].id}>
                            {adminWallets.map((wallet) => (
                                <Label key={wallet.id} htmlFor={wallet.id} className="flex flex-col space-y-1 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
                                    <div className="flex items-center gap-3">
                                        <RadioGroupItem value={wallet.id} id={wallet.id} />
                                        <div className="font-medium">{wallet.walletName}</div>
                                    </div>
                                    <div className="pl-8 text-sm">
                                        <div>Name: {wallet.name}</div>
                                        <div>Number: {wallet.number}</div>
                                    </div>
                                </Label>
                            ))}
                        </RadioGroup>
                        <div className="space-y-2">
                            <Label htmlFor="account-holder-name">Your Account Holder Name</Label>
                            <Input id="account-holder-name" placeholder="Your Name" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="account-number">Your Account Number</Label>
                            <Input id="account-number" placeholder="03xxxxxxxx" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount (PKR)</Label>
                            <Input id="amount" type="number" placeholder="500" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tid">Transaction ID (TID)</Label>
                            <Input id="tid" placeholder="e.g., 1234567890" />
                        </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Submit Request</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

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
