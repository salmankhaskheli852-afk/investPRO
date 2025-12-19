'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminWallets } from '@/lib/data';
import { PlusCircle, Save, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function AdminWalletPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Wallet Settings</h1>
        <p className="text-muted-foreground">
          Manage deposit accounts and available withdrawal methods for users.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Method Settings</CardTitle>
          <CardDescription>Enable or disable withdrawal options for all users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="jazzcash-switch" className="text-base">JazzCash</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to withdraw funds to a JazzCash account.
              </p>
            </div>
            <Switch id="jazzcash-switch" defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="easypaisa-switch" className="text-base">Easypaisa</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to withdraw funds to an Easypaisa account.
              </p>
            </div>
            <Switch id="easypaisa-switch" defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="bank-switch" className="text-base">Bank Transfer</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to withdraw funds to a bank account.
              </p>
            </div>
            <Switch id="bank-switch" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Deposit Accounts</CardTitle>
            <CardDescription>
              This information will be shown to users when they want to deposit funds.
            </CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Deposit Account</DialogTitle>
                <DialogDescription>
                  Fill in the details for the new account.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-wallet-name">Display Name</Label>
                  <Input id="new-wallet-name" placeholder="e.g., Easypaisa, HBL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-account-name">Account/Bank Name</Label>
                  <Input id="new-account-name" placeholder="e.g., John Doe, Meezan Bank" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-wallet-address">Address/Number</Label>
                  <Input id="new-wallet-address" placeholder="Account number or phone number" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="is-bank" />
                  <Label htmlFor="is-bank">This is a bank account</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Account/Bank Name</TableHead>
                <TableHead>Number/Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminWallets.map((wallet) => (
                <TableRow key={wallet.id}>
                  <TableCell className="font-medium">{wallet.walletName}</TableCell>
                  <TableCell>{wallet.name}</TableCell>
                  <TableCell>{wallet.number}</TableCell>
                  <TableCell>{wallet.isBank ? 'Bank' : 'Wallet'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <Button className='bg-primary hover:bg-primary/90'>
            <Save className="mr-2 h-4 w-4" />
            Save All Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
