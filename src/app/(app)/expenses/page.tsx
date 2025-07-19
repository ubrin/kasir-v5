
'use client';

import * as React from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import type { Expense } from '@/lib/types';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Repeat, Receipt, Package, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExpenseDialog } from './expense-dialog';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

export default function ExpensesPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);

    const fetchExpenses = React.useCallback(async () => {
        setLoading(true);
        try {
            const expensesQuery = collection(db, "expenses");
            const snapshot = await getDocs(expensesQuery);
            const allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            setExpenses(allExpenses);
        } catch (error) {
            console.error("Error fetching expenses:", error);
            toast({ title: "Gagal memuat data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleSaveSuccess = () => {
        toast({ title: "Pengeluaran disimpan" });
        fetchExpenses();
    };

    const expenseSummary = React.useMemo(() => {
        return expenses.reduce((acc, exp) => {
            if (!acc[exp.category]) {
                acc[exp.category] = { total: 0, count: 0 };
            }
            acc[exp.category].total += exp.amount;
            acc[exp.category].count += 1;
            return acc;
        }, {} as Record<Expense['category'], { total: number, count: number }>);
    }, [expenses]);

    const categories = [
        { name: 'Utama', key: 'utama', icon: Repeat, href: '/expenses/main' },
        { name: 'Angsuran', key: 'angsuran', icon: Receipt, href: '/expenses/installments' },
        { name: 'Lainnya', key: 'lainnya', icon: Package, href: '/expenses/other' },
    ] as const;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight">Laporan Pengeluaran</h1>
                    <p className="text-muted-foreground">Catat dan kelola semua pengeluaran bisnis Anda.</p>
                </div>
                <ExpenseDialog onSaveSuccess={handleSaveSuccess}>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengeluaran</Button>
                </ExpenseDialog>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {categories.map(category => {
                    const summary = expenseSummary[category.key] || { total: 0, count: 0 };
                    return (
                        <Link href={category.href} key={category.key}>
                            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-md bg-muted text-muted-foreground">
                                            <category.icon className="h-6 w-6"/>
                                        </div>
                                        <div>
                                            <CardTitle>{category.name}</CardTitle>
                                            <CardDescription>{summary.count} item pengeluaran</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                         <p className="text-lg font-bold text-destructive">Rp{summary.total.toLocaleString('id-ID')}</p>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground"/>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
