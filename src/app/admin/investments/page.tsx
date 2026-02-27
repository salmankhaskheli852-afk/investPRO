
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
import { Edit, PlusCircle, Trash2, Link as LinkIcon, Image as ImageIcon, Upload, Check, X, FileUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { InvestmentPlan } from '@/lib/data';
import { collection, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';

interface LibraryImage {
    id: string;
    url: string;
    name: string;
    storagePath?: string;
    createdAt: any;
}

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
    
    // Image selection state
    const [imageMode, setImageMode] = React.useState<'url' | 'library' | 'upload'>('library');
    const [imageUrl, setImageUrl] = React.useState('');
    const [selectedLibraryId, setSelectedLibraryId] = React.useState('');
    
    // Upload state
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);

    const [purchaseLimit, setPurchaseLimit] = React.useState(0);
    const [isSoldOut, setIsSoldOut] = React.useState(false);

    // Offer state
    const [offerEnabled, setOfferEnabled] = React.useState(false);
    
    const [isSaving, setIsSaving] = React.useState(false);

    // Dynamic Library from Firestore
    const libraryQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'image_library'), orderBy('createdAt', 'desc')) : null),
        [firestore]
    );
    const { data: dbLibraryImages } = useCollection<LibraryImage>(libraryQuery);

    const mergedLibrary = React.useMemo(() => {
        const staticImgs = PlaceHolderImages.map(img => ({
            id: img.id,
            url: img.imageUrl,
            name: img.id.replace(/-/g, ' '),
            isStatic: true,
            storagePath: undefined
        }));
        const dynamicImgs = dbLibraryImages?.map(img => ({
            id: img.id,
            url: img.url,
            name: img.name,
            isStatic: false,
            storagePath: img.storagePath
        })) || [];
        return [...dynamicImgs, ...staticImgs];
    }, [dbLibraryImages]);

    const isEditMode = planToEdit !== null;

    React.useEffect(() => {
        if (planToEdit) {
            setName(planToEdit.name);
            setCategoryId(planToEdit.categoryId);
            setPrice(planToEdit.price);
            setDailyPercentage(planToEdit.dailyIncomePercentage);
            setPeriod(planToEdit.incomePeriod);
            setImageUrl(planToEdit.imageUrl);
            setOfferEnabled(planToEdit.isOfferEnabled || false);
            setPurchaseLimit(planToEdit.purchaseLimit || 0);
            setIsSoldOut(planToEdit.isSoldOut || false);
            
            const inLibrary = mergedLibrary.find(img => img.url === planToEdit.imageUrl);
            if (inLibrary) {
                setImageMode('library');
                setSelectedLibraryId(inLibrary.id);
            } else {
                setImageMode('url');
            }
        } else {
            resetForm();
        }
    }, [planToEdit, mergedLibrary.length]);

    const resetForm = () => {
        setName('New Plan');
        setCategoryId(planCategories[0]?.id || '');
        setPrice(1000);
        setDailyPercentage(5);
        setPeriod(60);
        setImageUrl('');
        setSelectedLibraryId('');
        setImageMode('library');
        setSelectedFile(null);
        setUploadProgress(0);
        setPreviewUrl(null);
        setOfferEnabled(false);
        setPurchaseLimit(0);
        setIsSoldOut(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleImportImage = async () => {
        if (!firestore || !selectedFile) {
            toast({ variant: 'destructive', title: 'Select a file first' });
            return;
        }

        setIsImporting(true);
        try {
            const storage = getStorage();
            const storagePath = `app_files/${Date.now()}_${selectedFile.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, selectedFile);

            const uploadPromise = new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    }, 
                    (error) => reject(error), 
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    }
                );
            });

            const finalUrl = await uploadPromise;

            // Add to dynamic library
            const libraryRef = doc(collection(firestore, 'image_library'));
            // Clean name: remove extension and replace underscores/hyphens with spaces
            const fileName = selectedFile.name.split('.').slice(0, -1).join('.').replace(/[_-]/g, ' ');
            
            await setDoc(libraryRef, {
                id: libraryRef.id,
                url: finalUrl,
                name: fileName,
                storagePath: storagePath,
                createdAt: serverTimestamp()
            });

            toast({ title: 'Image Imported!', description: 'Saved to website files.' });
            
            // Cleanup and switch to library to select it
            setSelectedFile(null);
            setPreviewUrl(null);
            setUploadProgress(0);
            setImageMode('library');
            setSelectedLibraryId(libraryRef.id);

        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Import failed', description: err.message });
        } finally {
            setIsImporting(false);
        }
    };

    const handleDeleteLibraryImage = async (e: React.MouseEvent, img: any) => {
        e.stopPropagation();
        if (!firestore) return;

        try {
            await deleteDoc(doc(firestore, 'image_library', img.id));
            if (img.storagePath) {
                const storage = getStorage();
                const storageRef = ref(storage, img.storagePath);
                await deleteObject(storageRef).catch(() => {});
            }
            toast({ title: 'Removed from files' });
            if (selectedLibraryId === img.id) setSelectedLibraryId('');
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Delete failed' });
        }
    }

    const handleSavePlan = async () => {
        if (!firestore) return;
        setIsSaving(true);

        try {
            let finalImageUrl = imageUrl;
            if (imageMode === 'library') {
                finalImageUrl = mergedLibrary.find(img => img.id === selectedLibraryId)?.url || '';
            }

            if (!name || !categoryId || !price || !dailyPercentage || !period || !finalImageUrl) {
                toast({
                    variant: 'destructive',
                    title: 'Missing Fields',
                    description: 'Please fill all fields and select a file from library.',
                });
                setIsSaving(false);
                return;
            }

            const dailyIncome = price * (dailyPercentage / 100);
            const totalIncome = dailyIncome * period;

            const planData: Partial<InvestmentPlan> = {
                name,
                categoryId,
                price,
                dailyIncomePercentage: dailyPercentage,
                incomePeriod: period,
                imageUrl: finalImageUrl,
                totalIncome,
                isOfferEnabled: offerEnabled,
                purchaseLimit: purchaseLimit,
                isSoldOut: isSoldOut,
            };

            if (isEditMode && planToEdit) {
                const planRef = doc(firestore, 'investment_plans', planToEdit.id);
                await updateDoc(planRef, planData); 
                toast({ title: 'Plan Updated!' });
            } else {
                 const newDocRef = doc(collection(firestore, 'investment_plans'));
                 await setDoc(newDocRef, { 
                     ...planData, 
                     id: newDocRef.id,
                     purchaseCount: 0,
                     createdAt: serverTimestamp()
                    });
                toast({ title: 'Plan Created!' });
            }
            
            onSuccess();
            onOpenChange(false);
            if (!isEditMode) resetForm();

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit' : 'Add New'} Plan</DialogTitle>
                </DialogHeader>
                <div className="grid max-h-[70vh] gap-6 overflow-y-auto py-4 pr-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <input id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded-md" />
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

                    <div className="space-y-3">
                        <Label>Plan Image (Website Files)</Label>
                        <div className="flex gap-2 p-1 bg-muted rounded-md w-fit">
                            <Button variant={imageMode === 'library' ? 'secondary' : 'ghost'} size="sm" onClick={() => setImageMode('library')}><ImageIcon className="mr-2 h-4 w-4" />Library</Button>
                            <Button variant={imageMode === 'upload' ? 'secondary' : 'ghost'} size="sm" onClick={() => setImageMode('upload')}><FileUp className="mr-2 h-4 w-4" />Import New</Button>
                            <Button variant={imageMode === 'url' ? 'secondary' : 'ghost'} size="sm" onClick={() => setImageMode('url')}><LinkIcon className="mr-2 h-4 w-4" />URL</Button>
                        </div>

                        {imageMode === 'library' && (
                            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 border rounded-md">
                                {mergedLibrary.map(img => (
                                    <div 
                                        key={img.id}
                                        className={cn("relative cursor-pointer group rounded-md border-2 overflow-hidden", selectedLibraryId === img.id ? "border-primary" : "border-transparent")}
                                        onClick={() => setSelectedLibraryId(img.id)}
                                    >
                                        <div className="relative aspect-video w-full overflow-hidden rounded-sm">
                                            <Image src={img.url} alt={img.name} fill className="object-cover" />
                                        </div>
                                        <div className="p-1 text-[10px] uppercase font-bold text-center truncate bg-background/80">
                                            {img.name}
                                        </div>
                                        {!img.isStatic && (
                                            <Button 
                                                variant="destructive" 
                                                size="icon" 
                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                onClick={(e) => handleDeleteLibraryImage(e, img)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {imageMode === 'upload' && (
                            <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                                <Label className="text-xs text-muted-foreground">Select a file to import into website files</Label>
                                <Input type="file" accept="image/*" onChange={handleFileChange} className="bg-background" />
                                {previewUrl && (
                                    <div className="relative aspect-video w-full rounded-md overflow-hidden border shadow-sm">
                                        <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                                    </div>
                                )}
                                <Button onClick={handleImportImage} disabled={isImporting || !selectedFile} className="w-full">
                                    {isImporting ? `Importing ${Math.round(uploadProgress)}%` : 'Import to Library'}
                                </Button>
                                {uploadProgress > 0 && <Progress value={uploadProgress} className="h-1" />}
                            </div>
                        )}

                        {imageMode === 'url' && (
                            <Input placeholder="Paste Image Link here..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (Rs)</Label>
                            <Input id="price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="daily-percentage">Daily (%)</Label>
                            <Input id="daily-percentage" type="number" value={dailyPercentage} onChange={(e) => setDailyPercentage(Number(e.target.value))} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="period">Period (Days)</Label>
                            <Input id="period" type="number" value={period} onChange={(e) => setPeriod(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="purchase-limit">Limit</Label>
                            <Input id="purchase-limit" type="number" value={purchaseLimit} onChange={(e) => setPurchaseLimit(Number(e.target.value))} />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="offer-switch">Limited Time Offer</Label>
                        <Switch id="offer-switch" checked={offerEnabled} onCheckedChange={setOfferEnabled} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="sold-out-switch">Mark as Sold Out</Label>
                        <Switch id="sold-out-switch" checked={isSoldOut} onCheckedChange={setIsSoldOut} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSavePlan} disabled={isSaving || isImporting} className="w-full sm:w-auto">
                        {isSaving ? 'Saving Plan...' : 'Save Plan'}
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
    if (categoryToEdit) setName(categoryToEdit.name);
    else setName('');
  }, [categoryToEdit]);

  const handleSave = async () => {
    if (!firestore || !name) return;
    setIsSaving(true);
    try {
      if (isEditMode && categoryToEdit) {
        await updateDoc(doc(firestore, 'plan_categories', categoryToEdit.id), { name });
      } else {
        const newRef = doc(collection(firestore, 'plan_categories'));
        await setDoc(newRef, { id: newRef.id, name, createdAt: serverTimestamp() });
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
      <DialogContent>
        <DialogHeader><DialogTitle>{isEditMode ? 'Edit' : 'Add'} Category</DialogTitle></DialogHeader>
        <div className="py-4 space-y-2">
          <Label>Category Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., VIP" />
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Category'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function AdminInvestmentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const [isPlanFormOpen, setIsPlanFormOpen] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<InvestmentPlan | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<PlanCategory | null>(null);

  const plansQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, 'investment_plans'), orderBy('createdAt', 'desc')) : null, 
    [firestore, user]
  );
  const { data: investmentPlans, isLoading: isLoadingPlans, forceRefetch: refetchPlans } = useCollection<InvestmentPlan>(plansQuery);

  const categoriesQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, 'plan_categories'), orderBy('createdAt', 'asc')) : null, 
    [firestore, user]
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
      toast({ title: 'Plan Deleted' });
    } catch(e: any) {
       toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleAddNewPlanClick = () => {
    if (!planCategories || planCategories.length === 0) {
      toast({ variant: 'destructive', title: 'No Categories Found', description: 'Please add a category first.' });
      return;
    }
    setEditingPlan(null);
    setIsPlanFormOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Investment Management</h1>
          <p className="text-muted-foreground">Manage your plans and import assets directly.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90" onClick={handleAddNewPlanClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Plan
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Active Investment Plans</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {isLoadingPlans ? <p>Loading plans...</p> : investmentPlans?.map((plan) => (
                  <div key={plan.id} className="relative group">
                    <InvestmentPlanCard plan={plan} showPurchaseButton={false} />
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <Button variant="outline" size="icon" className="bg-background/80" onClick={() => handleEditPlan(plan)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeletePlan(plan)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Plan Categories</CardTitle>
            <Button variant="outline" size="sm" onClick={() => { setEditingCategory(null); setIsCategoryFormOpen(true); }}>Add</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {isLoadingCategories ? <TableRow><TableCell>Loading...</TableCell></TableRow> : planCategories?.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setIsCategoryFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <PlanFormDialog isOpen={isPlanFormOpen} onOpenChange={setIsPlanFormOpen} planToEdit={editingPlan} onSuccess={refetchPlans} planCategories={planCategories || []} />
      <CategoryFormDialog isOpen={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen} categoryToEdit={editingCategory} onSuccess={refetchCategories} />
    </div>
  );
}
