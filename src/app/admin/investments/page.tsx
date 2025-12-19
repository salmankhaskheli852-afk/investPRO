
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { planCategories } from '@/lib/data';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { InvestmentPlan } from '@/lib/data';
import { collection, addDoc, doc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AdminInvestmentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Form state
  const [name, setName] = React.useState('New Plan');
  const [categoryId, setCategoryId] = React.useState('');
  const [price, setPrice] = React.useState(1000);
  const [dailyPercentage, setDailyPercentage] = React.useState(5);
  const [period, setPeriod] = React.useState(60);
  const [imageUrl, setImageUrl] = React.useState('https://picsum.photos/seed/105/600/400');
  const [isSaving, setIsSaving] = React.useState(false);


  const plansQuery = useMemoFirebase(
    () => firestore ? collection(firestore, 'investment_plans') : null,
    [firestore]
  );
  const { data: investmentPlans, isLoading } = useCollection<InvestmentPlan>(plansQuery);
  
  const resetForm = () => {
    setName('New Plan');
    setCategoryId('');
    setPrice(1000);
    setDailyPercentage(5);
    setPeriod(60);
    setImageUrl('https://picsum.photos/seed/105/600/400');
  }

  const handleAddPlan = async () => {
    if (!firestore) return;
    if (!name || !categoryId || !price || !dailyPercentage || !period || !imageUrl) {
        toast({
            variant: 'destructive',
            title: 'Missing Fields',
            description: 'Please fill out all the fields to create a plan.',
        });
        return;
    }
    
    setIsSaving(true);
    try {
        const newPlanRef = doc(collection(firestore, 'investment_plans'));
        const dailyIncome = price * (dailyPercentage / 100);
        const totalIncome = dailyIncome * period;

        await addDoc(collection(firestore, 'investment_plans'), {
            id: newPlanRef.id,
            name,
            categoryId,
            price,
            dailyIncomePercentage,
            incomePeriod: period,
            imageUrl,
            totalIncome: totalIncome,
            imageHint: "investment growth", // default hint
        });

        toast({
            title: 'Plan Created!',
            description: `${name} has been added to the investment plans.`,
        });
        
        resetForm();
        setIsDialogOpen(false);
    } catch(e: any) {
        toast({
            variant: 'destructive',
            title: 'Error Creating Plan',
            description: e.message || 'There was an error saving the plan.',
        });
    } finally {
        setIsSaving(false);
    }
  }


  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Investments</h1>
          <p className="text-muted-foreground">Add, edit, or remove investment plans and categories.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Investment Plan</DialogTitle>
              <DialogDescription>
                Fill in the details for the new plan. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {planCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Product Price (Rs)</Label>
                <Input id="price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="daily-percentage" className="text-right">Daily Income (%)</Label>
                <Input id="daily-percentage" type="number" value={dailyPercentage} onChange={(e) => setDailyPercentage(Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="period" className="text-right">Income Period</Label>
                <Input id="period" type="number" value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">Image URL</Label>
                <Input id="image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
               <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={handleAddPlan} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Investment Plans</CardTitle>
                    <CardDescription>A list of all available investment plans.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {isLoading && <p>Loading plans...</p>}
                    {investmentPlans?.map((plan) => (
                       <div key={plan.id} className="relative group">
                         <InvestmentPlanCard plan={plan} showPurchaseButton={false} />
                         <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="outline" size="icon" className="bg-background/80 hover:bg-background">
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                         </div>
                       </div>
                    ))}
                  </div>
                </CardContent>
            </Card>
        </div>
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>Manage investment plan categories.</CardDescription>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Category</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="category-name" className="text-right">Name</Label>
                                <Input id="category-name" placeholder="e.g., High-Risk" className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Create Category</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {planCategories.map(cat => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                   </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
