
'use client';

import * as React from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, increment, writeBatch, addDoc } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import type { Expense } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { CardContent } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';

export default function InstallmentsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = React.useState(true);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [paidExpenseNames, setPaidExpenseNames] = React.useState<Set<string>>(new Set());
    const [expenseToDelete, setExpenseToDelete] = React.useState<Expense | null>(null);

    const fetchExpenses = React.useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date();
            const start = startOfMonth(today);
            const end = endOfMonth(today);

            const installmentsQuery = query(collection(db, "expenses"), where("category", "==", "angsuran"));
            const snapshot = await getDocs(installmentsQuery);

            const allInstallments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            
            // Templates are expenses without a date
            const expenseTemplates = allInstallments.filter(exp => !exp.date);
            setExpenses(expenseTemplates.sort((a, b) => (a.dueDateDay ?? 0) - (b.dueDateDay ?? 0)));

            // Check for payments made this month
            const paidNames = new Set<string>();
            allInstallments.forEach(expense => {
                 if (expense.date) {
                    const expenseDate = parseISO(expense.date);
                    if (isWithinInterval(expenseDate, { start, end })) {
                        paidNames.add(expense.name);
                    }
                }
            });
            setPaidExpenseNames(paidNames);

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
            toast({ title: "Lunas", description: "Angsuran ini sudah lunas sepenuhnya.", variant: "default" });
            return;
        }

        try {
            const batch = writeBatch(db);
            const expenseRef = doc(db, 'expenses', expense.id);
            batch.update(expenseRef, {
                paidTenor: increment(1)
            });
            
            // Create a new expense record with a date to mark it as a transaction
            const expenseRecord: Omit<Expense, 'id'> = {
                ...expense,
                date: format(new Date(), 'yyyy-MM-dd'),
                note: `Pembayaran angsuran ke-${(expense.paidTenor ?? 0) + 1} untuk ${expense.name}`
            };
            const { id, ...recordToSave } = expenseRecord;
            
            const newRecordRef = doc(collection(db, 'expenses'));
            batch.set(newRecordRef, recordToSave);
            
            await batch.commit();

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

            <CardContent className="pt-6 border rounded-lg p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Angsuran</TableHead>
                            <TableHead>Tenor</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                            <TableHead className="text-center">Jatuh Tempo</TableHead>
                             <TableHead className="text-center">Status Bulan Ini</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.length > 0 ? expenses.map(expense => {
                            const progress = ((expense.paidTenor ?? 0) / (expense.tenor ?? 1)) * 100;
                            const isPaidThisMonth = paidExpenseNames.has(expense.name);
                            const isFullyPaid = (expense.paidTenor ?? 0) >= (expense.tenor ?? 0);
                            return (
                            <TableRow key={expense.id}>
                                <TableCell className="font-medium">{expense.name}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <span>{expense.paidTenor || 0} / {expense.tenor} bulan</span>
                                        <Progress value={progress} />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">Rp{expense.amount.toLocaleString('id-ID')}</TableCell>
                                <TableCell className="text-center">Setiap Tgl. {expense.dueDateDay}</TableCell>
                                <TableCell className="text-center">
                                     <Badge variant={isPaidThisMonth || isFullyPaid ? "secondary" : "default"} className={isPaidThisMonth || isFullyPaid ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                                            {isFullyPaid ? "Lunas" : isPaidThisMonth ? "Sudah Dibayar" : "Belum Lunas"}
                                     </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handlePayInstallment(expense)}
                                            disabled={isPaidThisMonth || isFullyPaid}
                                        >
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
                        )}) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    Belum ada data angsuran.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>

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
