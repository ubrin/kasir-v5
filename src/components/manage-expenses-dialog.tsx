
'use client';

import * as React from 'react';
import type { Expense } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { EditExpenseDialog } from './edit-expense-dialog';

interface ManageExpensesDialogProps {
  expenses: Expense[];
  category: 'utama' | 'angsuran';
  onDelete: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  children: React.ReactNode;
}

export function ManageExpensesDialog({ expenses, category, onDelete, onEdit, children }: ManageExpensesDialogProps) {
  const [open, setOpen] = React.useState(false);
  
  const handleDeleteClick = (expense: Expense) => {
    onDelete(expense);
    // Keep the dialog open if there are still items
    if (expenses.length <= 1) {
      setOpen(false);
    }
  }

  const categoryTitles = {
    utama: "Wajib",
    angsuran: "Angsuran",
    lainnya: "Lainnya"
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Kelola Templat {categoryTitles[category]}</DialogTitle>
          <DialogDescription>
            Ubah atau hapus templat untuk pengeluaran Anda.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jumlah</TableHead>
                  {category === 'angsuran' && <TableHead>Tenor</TableHead>}
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>Rp{item.amount.toLocaleString('id-ID')}</TableCell>
                    {category === 'angsuran' && (
                        <TableCell>
                        <Badge variant={(item.paidTenor || 0) >= (item.tenor || 0) ? "default" : "outline"} className={(item.paidTenor || 0) >= (item.tenor || 0) ? "bg-green-100 text-green-800" : ""}>
                                {item.paidTenor || 0} / {item.tenor}
                            </Badge>
                        </TableCell>
                    )}
                    <TableCell className="text-right">
                      <EditExpenseDialog expense={item} onExpenseUpdated={onEdit}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </EditExpenseDialog>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
             <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <p className="text-lg font-medium">Tidak Ada Templat</p>
                <p className="text-muted-foreground">Anda belum menambahkan templat untuk kategori ini.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
