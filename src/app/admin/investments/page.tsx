import Image from 'next/image';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { investmentPlans } from '@/lib/data';
import { Edit, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminInvestmentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Manage Investments</h1>
          <p className="text-muted-foreground">Add, edit, or remove investment plans.</p>
        </div>
        <Dialog>
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
                <Input id="name" defaultValue="New Plan" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Price (PKR)</Label>
                <Input id="price" type="number" defaultValue="1000" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="daily" className="text-right">Daily Income (%)</Label>
                <Input id="daily" type="number" defaultValue="3" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="total" className="text-right">Total Income (PKR)</Label>
                <Input id="total" type="number" defaultValue="1800" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">Image URL</Label>
                <Input id="image" defaultValue="https://picsum.photos/seed/105/600/400" className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className='pt-6'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Daily Income</TableHead>
                <TableHead>Total Income</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investmentPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <Image
                      src={plan.imageUrl}
                      alt={plan.name}
                      width={64}
                      height={48}
                      className="rounded-md object-cover"
                      data-ai-hint={plan.imageHint}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{plan.price.toLocaleString()} PKR</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{plan.dailyIncome}%</Badge>
                  </TableCell>
                  <TableCell>{plan.totalIncome.toLocaleString()} PKR</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
