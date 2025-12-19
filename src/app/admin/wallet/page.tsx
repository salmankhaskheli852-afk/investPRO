import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminWalletDetails } from '@/lib/data';
import { Save } from 'lucide-react';

export default function AdminWalletPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Wallet Settings</h1>
        <p className="text-muted-foreground">
          Set the wallet details that will be displayed to users for deposits.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Deposit Wallet Information</CardTitle>
          <CardDescription>
            This information will be shown to users when they want to deposit funds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet-name">Wallet Name (e.g., USDT TRC20)</Label>
            <Input id="wallet-name" defaultValue={adminWalletDetails.walletName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input id="account-name" defaultValue={adminWalletDetails.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wallet-address">Wallet Address/Number</Label>
            <Input id="wallet-address" defaultValue={adminWalletDetails.number} />
          </div>
        </CardContent>
        <CardFooter>
          <Button className='bg-primary hover:bg-primary/90'>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
