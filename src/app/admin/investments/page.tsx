
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlanCategory } from '@/lib/data';
import { Edit, PlusCircle, Trash2, Timer } from 'lucide-react';
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
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


const PlanFormDialog = ({
    isOpen,
    onOpenChange,
    planToEdit,
    onSuccess,
    planCategories,
} : {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    planToEdit: InvestmentPlan | null;
    onSuccess: () => void;
    planCategories: PlanCategory[];
}) => {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [name, setName] = React.useState('');
    const [categoryId, setCategoryId] = React.useState('');
    const [price, setPrice] = React.useState(1000);
    const [dailyPercentage, setDailyPercentage] = React.useState(5);
    const [period, setPeriod] = React.useState(60);
    const [imageUrl, setImageUrl] = React.useState('https://picsum.photos/seed/105/600/400');
    const [imageHint, setImageHint] = React.useState('investment growth');
    const [purchaseLimit, setPurchaseLimit] = React.useState(0);
    const [isSoldOut, setIsSoldOut] = React.useState(false);

    // Offer state
    const [offerEnabled, setOfferEnabled] = React.useState(false);
    const [offerDays, setOfferDays] = React.useState(1);
    const [offerHours, setOfferHours] = React.useState(0);
    const [offerMinutes, setOfferMinutes] = React.useState(0);
    const [offerSeconds, setOfferSeconds] = React.useState(0);
    
    const [isSaving, setIsSaving] = React.useState(false);

    const isEditMode = planToEdit !== null;

    React.useEffect(() => {
        if (planToEdit) {
            setName(planToEdit.name);
            setCategoryId(planToEdit.categoryId);
            setPrice(planToEdit.price);
            setDailyPercentage(planToEdit.dailyIncomePercentage);
            setPeriod(planToEdit.incomePeriod);
            setImageUrl(planToEdit.imageUrl);
            setImageHint(planToEdit.imageHint || 'investment growth');
            setOfferEnabled(planToEdit.isOfferEnabled || false);
            setPurchaseLimit(planToEdit.purchaseLimit || 0);
            setIsSoldOut(planToEdit.isSoldOut || false);
            // Don't prefill duration, admin should set it if they want to update it
            setOfferDays(1);
            setOfferHours(0);
            setOfferMinutes(0);
            setOfferSeconds(0);
        } else {
            resetForm();
        }
    }, [planToEdit]);

    const resetForm = () => {
        setName('New Plan');
        setCategoryId(planCategories[0]?.id || '');
        setPrice(1000);
        setDailyPercentage(5);
        setPeriod(60);
        setImageUrl('https://picsum.photos/seed/105/600/400');
        setImageHint('investment growth');
        setOfferEnabled(false);
        setOfferDays(1);
        setOfferHours(0);
        setOfferMinutes(0);
        setOfferSeconds(0);
        setPurchaseLimit(0);
        setIsSoldOut(false);
    };

    const handleSavePlan = async () => {
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
            const dailyIncome = price * (dailyPercentage / 100);
            const totalIncome = dailyIncome * period;

            let offerEndTime: Timestamp | null = null;
            if (offerEnabled) {
                const totalMilliseconds = (offerDays * 24 * 60 * 60 * 1000) +
                                          (offerHours * 60 * 60 * 1000) +
                                          (offerMinutes * 60 * 1000) +
                                          (offerSeconds * 1000);
                if (totalMilliseconds > 0) {
                    const now = new Date();
                    offerEndTime = Timestamp.fromDate(new Date(now.getTime() + totalMilliseconds));
                }
            }

            const planData: Partial<InvestmentPlan> = {
                name,
                categoryId,
                price,
                dailyIncomePercentage: dailyPercentage,
                incomePeriod: period,
                imageUrl,
                imageHint,
                totalIncome: totalIncome,
                isOfferEnabled: offerEnabled,
                purchaseLimit: purchaseLimit,
                isSoldOut: isSoldOut,
            };

            if (isEditMode && planToEdit) {
                const planRef = doc(firestore, 'investment_plans', planToEdit.id);
                await updateDoc(planRef, { ...planData, offerEndTime: offerEndTime }); 
                toast({
                    title: 'Plan Updated!',
                    description: `${name} has been successfully updated.`,
                });
            } else {
                 const newDocRef = doc(collection(firestore, 'investment_plans'));
                 await setDoc(newDocRef, { 
                     ...planData, 
                     id: newDocRef.id,
                     purchaseCount: 0,
                     createdAt: serverTimestamp(),
                     offerEndTime: offerEndTime
                    });

                toast({
                    title: 'Plan Created!',
                    description: `${name} has been added to the investment plans.`,
                });
            }
            
            onSuccess();
            onOpenChange(false);
            if (!isEditMode) {
                resetForm();
            }

        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: `Error ${isEditMode ? 'Updating' : 'Creating'} Plan`,
                description: e.message || `There was an error saving the plan.`,
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Investment Plan</DialogTitle>
                    <DialogDescription>
                        Fill in the details for the plan. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid max-h-[70vh] gap-6 overflow-y-auto py-4 pr-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger id="category">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {planCategories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="price">Product Price (Rs)</Label>
                        <Input id="price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="daily-percentage">Daily Income (%)</Label>
                        <Input id="daily-percentage" type="number" value={dailyPercentage} onChange={(e) => setDailyPercentage(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="period">Income Period (days)</Label>
                        <Input id="period" type="number" value={period} onChange={(e) => setPeriod(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="purchase-limit">Purchase Limit</Label>
                        <Input id="purchase-limit" type="number" value={purchaseLimit} onChange={(e) => setPurchaseLimit(Number(e.target.value))} />
                        <p className="text-xs text-muted-foreground">Set to 0 for unlimited purchases.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="image">Image URL</Label>
                        <Input id="image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="image-hint">Image Hint</Label>
                        <Input id="image-hint" value={imageHint} onChange={(e) => setImageHint(e.target.value)} />
                    </div>

                    <div className="mt-4 pt-4 border-t">
                        <h4 className="text-lg font-medium">Limited-Time Offer</h4>
                        <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
                            <Label htmlFor="offer-switch" className="flex flex-col space-y-1">
                            <span>Enable Offer for this Plan</span>
                            </Label>
                            <Switch
                            id="offer-switch"
                            checked={offerEnabled}
                            onCheckedChange={setOfferEnabled}
                            />
                        </div>
                        {offerEnabled && (
                            <div className="mt-4 space-y-4">
                                <Label>Offer Duration</Label>
                                <div className="grid grid-cols-4 gap-2">
                                     <div className="space-y-1">
                                        <Label htmlFor="offer-days" className="text-xs">Days</Label>
                                        <Input id="offer-days" type="number" value={offerDays} onChange={e => setOfferDays(Number(e.target.value))} min="0" />
                                     </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="offer-hours" className="text-xs">Hours</Label>
                                        <Input id="offer-hours" type="number" value={offerHours} onChange={e => setOfferHours(Number(e.target.value))} max="23" min="0" />
                                     </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="offer-minutes" className="text-xs">Mins</Label>
                                        <Input id="offer-minutes" type="number" value={offerMinutes} onChange={e => setOfferMinutes(Number(e.target.value))} max="59" min="0" />
                                     </div>
                                     <div className="space-y-1">
                                        <Label htmlFor="offer-seconds" className="text-xs">Secs</Label>
                                        <Input id="offer-seconds" type="number" value={offerSeconds} onChange={e => setOfferSeconds(Number(e.target.value))} max="59" min="0" />
                                     </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="text-lg font-medium">Plan Status</h4>
                         <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
                            <Label htmlFor="sold-out-switch" className="flex flex-col space-y-1">
                                <span>Manually Mark as Sold Out</span>
                                <span className="font-normal leading-snug text-muted-foreground">
                                    This will override other settings and show the plan as sold out.
                                </span>
                            </Label>
                            <Switch
                                id="sold-out-switch"
                                checked={isSoldOut}
                                onCheckedChange={setIsSoldOut}
                            />
                        </div>
                    </div>

                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" onClick={handleSavePlan} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const CategoryFormDialog = ({
  isOpen,
  onOpenChange,
  categoryToEdit,
  onSuccess,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryToEdit: PlanCategory | null;
  onSuccess: () => void;
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [name, setName] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const isEditMode = categoryToEdit !== null;

  React.useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
    } else {
      setName('');
    }
  }, [categoryToEdit]);

  const handleSave = async () => {
    if (!firestore || !name) return;
    setIsSaving(true);
    try {
      if (isEditMode && categoryToEdit) {
        const categoryRef = doc(firestore, 'plan_categories', categoryToEdit.id);
        await updateDoc(categoryRef, { name });
        toast({ title: 'Category Updated' });
      } else {
        const newDocRef = doc(collection(firestore, 'plan_categories'));
        await setDoc(newDocRef, { id: newDocRef.id, name, createdAt: serverTimestamp() });
        toast({ title: 'Category Created' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Category</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., High-Risk" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant='outline'>Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function AdminInvestmentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isPlanFormOpen, setIsPlanFormOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<InvestmentPlan | null>(null);

  const [isCategoryFormOpen, setIsCategoryFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<PlanCategory | null>(null);

  const plansQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'investment_plans'), orderBy('createdAt', 'desc')) : null,
    [firestore]
  );
  const { data: investmentPlans, isLoading: isLoadingPlans, forceRefetch: refetchPlans } = useCollection<InvestmentPlan>(plansQuery);

  const categoriesQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'plan_categories'), orderBy('createdAt', 'asc')) : null,
    [firestore]
  );
  const { data: planCategories, isLoading: isLoadingCategories, forceRefetch: refetchCategories } = useCollection<PlanCategory>(categoriesQuery);
  
  const handleEditPlan = (plan: InvestmentPlan) => {
    setEditingPlan(plan);
    setIsPlanFormOpen(true);
  };
  
  const handleDeletePlan = async (plan: InvestmentPlan) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, 'investment_plans', plan.id));
      toast({
        title: 'Plan Deleted',
        description: `${plan.name} has been removed.`,
      });
    } catch(e: any) {
       toast({
        variant: 'destructive',
        title: 'Error Deleting Plan',
        description: e.message,
      });
    }
  };

  const handleEditCategory = (category: PlanCategory) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const handleDeleteCategory = async (category: PlanCategory) => {
    if (!firestore) return;
    try {
      // Add check if any plan is using this category
      await deleteDoc(doc(firestore, 'plan_categories', category.id));
      toast({ title: 'Category Deleted' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error deleting category', description: e.message });
    }
  };

  const sortedPlans = React.useMemo(() => {
    if (!investmentPlans) return [];
    
    const now = Timestamp.now();
    
    // Plans with active offers, sorted by creation date descending
    const activeOfferPlans = investmentPlans
      .filter(p => p.isOfferEnabled && p.offerEndTime && p.offerEndTime > now)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

    // Regular plans (no offer or offer not enabled), sorted by creation date descending
    const regularPlans = investmentPlans
      .filter(p => !p.isOfferEnabled || !p.offerEndTime)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

    // Closed plans, sorted by creation date descending
    const closedPlans = investmentPlans
      .filter(p => p.isOfferEnabled && p.offerEndTime && p.offerEndTime <= now)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

    return [...activeOfferPlans, ...regularPlans, ...closedPlans];
  }, [investmentPlans]);

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">Manage Investments</h1>
            <p className="text-muted-foreground">Add, edit, or remove investment plans and categories.</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90" onClick={() => { setEditingPlan(null); setIsPlanFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Plan
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
              <Card className="rounded-lg">
                  <CardHeader>
                      <CardTitle>Investment Plans</CardTitle>
                      <CardDescription>A list of all available investment plans.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      {isLoadingPlans && <p>Loading plans...</p>}
                      {sortedPlans?.map((plan) => (
                         <div key={plan.id} className="relative group">
                           <InvestmentPlanCard plan={plan} showPurchaseButton={false} />
                           <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              <Button variant="outline" size="icon" className="bg-background/80 hover:bg-background" onClick={() => handleEditPlan(plan)}>
                                  <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the <strong>{plan.name}</strong> plan.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeletePlan(plan)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                           </div>
                         </div>
                      ))}
                    </div>
                  </CardContent>
              </Card>
            </div>
          </div>
          <div className="space-y-8">
            <div className="rounded-lg p-0.5 bg-gradient-to-br from-blue-400 via-purple-500 to-orange-500">
              <Card className="rounded-lg">
                  <CardHeader>
                      <CardTitle>Categories</CardTitle>
                      <CardDescription>Manage investment plan categories.</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       <Button variant="outline" className="w-full" onClick={() => { setEditingCategory(null); setIsCategoryFormOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Category
                        </Button>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {isLoadingCategories && (
                                <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>
                              )}
                              {planCategories?.map(cat => (
                                  <TableRow key={cat.id}>
                                      <TableCell className="font-medium">{cat.name}</TableCell>
                                      <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-2">
                                              <Button variant="ghost" size="icon" onClick={() => handleEditCategory(cat)}>
                                                  <Edit className="h-4 w-4" />
                                              </Button>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                      <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete {cat.name}?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteCategory(cat)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
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
      </div>
      <PlanFormDialog 
        isOpen={isPlanFormOpen}
        onOpenChange={setIsPlanFormOpen}
        planToEdit={editingPlan}
        onSuccess={refetchPlans}
        planCategories={planCategories || []}
      />
      <CategoryFormDialog
        isOpen={isCategoryFormOpen}
        onOpenChange={setIsCategoryFormOpen}
        categoryToEdit={editingCategory}
        onSuccess={refetchCategories}
      />
    </>
  );
}
