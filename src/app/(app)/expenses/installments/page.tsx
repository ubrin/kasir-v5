
'use client';

import * as React from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import type { Expense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

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
import { Progress } from '@/components/ui/progress';

export default function InstallmentsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = React.useState(true);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [expenseToDelete, setExpenseToDelete] = React.useState<Expense | null>(null);

    const fetchExpenses = React.useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "expenses"), where("category", "==", "angsuran"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            setExpenses(data.sort((a,b) => (b.date && a.date) ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0));
        } catch (error) {
            console.error("Error fetching installments:", error);
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
            toast({ title: "Angsuran Dihapus", description: `${expenseToDelete.name} telah dihapus.` });
            setExpenseToDelete(null);
            fetchExpenses();
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast({ title: "Gagal Menghapus", variant: "destructive" });
        }
    };
    
    const handlePayInstallment = async (expense: Expense) => {
        if ((expense.paidTenor ?? 0) >= (expense.tenor ?? 0)) {
            toast({ title: "Lunas", description: "Angsuran ini sudah lunas.", variant: "default" });
            return;
        }

        try {
            const expenseRef = doc(db, 'expenses', expense.id);
            await updateDoc(expenseRef, {
                paidTenor: increment(1)
            });
            toast({ title: "Pembayaran Dicatat", description: `Pembayaran angsuran untuk ${expense.name} berhasil.` });
            fetchExpenses();
        } catch (error) {
            console.error("Error paying installment:", error);
            toast({ title: "Gagal Membayar", variant: "destructive" });
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
                        <h1 className="text-3xl font-bold tracking-tight">Pengeluaran Angsuran</h1>
                        <p className="text-muted-foreground">Daftar semua angsuran dan cicilan Anda.</p>
                    </div>
                </div>
                <ExpenseDialog onSaveSuccess={fetchExpenses}>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah Angsuran</Button>
                </ExpenseDialog>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Angsuran</TableHead>
                                <TableHead>Tenor</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead className="text-center">Jatuh Tempo</TableHead>
                                <TableHead>
                                    <span className="sr-only">Aksi</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expenses.length > 0 ? expenses.map(expense => {
                                const progress = ((expense.paidTenor ?? 0) / (expense.tenor ?? 1)) * 100;
                                return (
                                <TableRow key={expense.id}>
                                    <TableCell className="font-medium">{expense.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1 w-24">
                                            <span>{expense.paidTenor || 0} / {expense.tenor} bulan</span>
                                            <Progress value={progress} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">Rp{expense.amount.toLocaleString('id-ID')}</TableCell>
                                    <TableCell className="text-center">{expense.date ? format(parseISO(expense.date), "d MMM yyyy", { locale: localeId }) : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handlePayInstallment(expense)}>
                                                    <Receipt className="mr-2 h-4 w-4" />
                                                    <span>Bayar Angsuran Ini</span>
                                                </DropdownMenuItem>
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
                                    </TableCell>
                                </TableRow>
                            )}) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        Belum ada data angsuran.
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
                        Tindakan ini akan menghapus data angsuran <span className="font-bold">{expenseToDelete?.name}</span> secara permanen.
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
