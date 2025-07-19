
'use client';

import * as React from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import type { Expense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Loader2, ArrowLeft, PlusCircle, Edit, Trash2, Receipt } from 'lucide-react';
import { ExpenseDialog } from '../expense-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format } from 'date-fns';

export default function MainExpensesPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = React.useState(true);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [expenseToDelete, setExpenseToDelete] = React.useState<Expense | null>(null);

    const fetchExpenses = React.useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "expenses"), where("category", "==", "utama"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            setExpenses(data);
        } catch (error) {
            console.error("Error fetching main expenses:", error);
            toast({ title: "Gagal memuat data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);
    
    const handleDeleteClick = (expense: Expense) => {
        setExpenseToDelete(expense);
    };

    const confirmDelete = async () => {
        if (!expenseToDelete) return;
        try {
            await deleteDoc(doc(db, 'expenses', expenseToDelete.id));
            toast({ title: "Pengeluaran Dihapus", description: `${expenseToDelete.name} telah dihapus.` });
            setExpenseToDelete(null);
            fetchExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast({ title: "Gagal Menghapus", variant: "destructive" });
        }
    };
    
    const handlePayMainExpense = async (expense: Expense) => {
        try {
            const expenseRecord: Omit<Expense, 'id'> = {
                name: expense.name,
                amount: expense.amount,
                category: 'lainnya',
                date: format(new Date(), 'yyyy-MM-dd'),
                note: `Pembayaran rutin untuk ${expense.name}`
            };
            await addDoc(collection(db, 'expenses'), expenseRecord);
            toast({
                title: 'Pembayaran Dicatat',
                description: `Pengeluaran untuk ${expense.name} sejumlah Rp${expense.amount.toLocaleString('id-ID')} telah dicatat sebagai pengeluaran 'Lainnya'.`,
                action: (
                   <Button variant="secondary" size="sm" onClick={() => router.push('/expenses/other')}>
                        Lihat
                   </Button>
                )
            });
        } catch (error) {
            console.error("Error creating expense record:", error);
            toast({ title: "Gagal Mencatat Pembayaran", variant: "destructive" });
        }
    }


    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Pengeluaran Utama</h1>
                        <p className="text-muted-foreground">Daftar pengeluaran rutin bulanan Anda.</p>
                    </div>
                </div>
                <ExpenseDialog onSaveSuccess={fetchExpenses}>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah Baru</Button>
                </ExpenseDialog>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Pengeluaran</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="text-center">Jatuh Tempo</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.length > 0 ? expenses.map(expense => (
                                <TableRow key={expense.id}>
                                    <TableCell className="font-medium">{expense.name}</TableCell>
                                    <TableCell className="text-right">Rp{expense.amount.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-center">Setiap Tgl. {expense.dueDateDay}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="sm" onClick={() => handlePayMainExpense(expense)}>
                                                <Receipt className="mr-2 h-4 w-4"/> Bayar
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <ExpenseDialog expense={expense} onSaveSuccess={fetchExpenses}>
                                                        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>Ubah</span>
                                                        </button>
                                                    </ExpenseDialog>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(expense)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Hapus</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        Belum ada data pengeluaran utama.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={!!expenseToDelete} onOpenChange={(isOpen) => !isOpen && setExpenseToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan menghapus data pengeluaran <span className="font-bold">{expenseToDelete?.name}</span> secara permanen.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={confirmDelete}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        Ya, Hapus
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}
