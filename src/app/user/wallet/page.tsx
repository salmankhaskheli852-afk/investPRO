import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminWalletDetails } from '@/lib/data';
import { ArrowDownToLine, ArrowUpFromLine, Copy } from 'lucide-react';

export default function UserWalletPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">My Wallet</h1>
        <p className="text-muted-foreground">Manage your funds, deposit, and withdraw.</p>
      </div>

      <Tabs defaultValue="deposit" className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Deposit
          </TabsTrigger>
          <TabsTrigger value="withdraw">
            <ArrowUpFromLine className="mr-2 h-4 w-4" />
            Withdraw
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="deposit">
          <Card>
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
        </TabsContent>

        <TabsContent value="withdraw">
          <Card>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
