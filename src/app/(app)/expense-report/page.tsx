
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense, ExpenseCategory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const categoryTitles: Record<ExpenseCategory, string> = {
    main: "Pengeluaran Utama",
    installments: "Angsuran",
    other: "Pengeluaran Lainnya"
};

export default function ExpenseReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [loading, setLoading] = React.useState(true);
    const [expense, setExpense] = React.useState<Expense | null>(null);

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category') as ExpenseCategory | null;
    
    React.useEffect(() => {
        if (!from || !category) {
            setLoading(false);
            return;
        }

        const fetchExpenseData = async () => {
            setLoading(true);
            try {
                const expensesQuery = query(collection(db, "expenses"), where("periodFrom", "==", from));
                const expensesSnapshot = await getDocs(expensesQuery);
                
                if (!expensesSnapshot.empty) {
                    const expenseData = { id: expensesSnapshot.docs[0].id, ...expensesSnapshot.docs[0].data() } as Expense;
                    setExpense(expenseData);
                } else {
                    setExpense(null);
                }
            } catch (error) {
                console.error("Error fetching expense data:", error);
                toast({
                    title: "Gagal memuat data",
                    description: "Tidak dapat mengambil data pengeluaran.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };

        fetchExpenseData();
    }, [from, category, toast]);

    const renderCategoryDetails = () => {
        if (!expense || !category) {
            return (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                        Tidak ada data pengeluaran untuk kategori ini pada periode yang dipilih.
                    </TableCell>
                </TableRow>
            );
        }

        switch (category) {
            case 'main':
                return (
                    <>
                        <TableRow>
                            <TableCell className="font-medium">Bandwidth</TableCell>
                            <TableCell className="text-right">Rp{expense.mainExpenses.bandwidth.toLocaleString('id-ID')}</TableCell>
                            <TableCell>-</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Listrik</TableCell>
                            <TableCell className="text-right">Rp{expense.mainExpenses.electricity.toLocaleString('id-ID')}</TableCell>
                            <TableCell>-</TableCell>
                        </TableRow>
                    </>
                );
            case 'installments':
                return (
                     <>
                        <TableRow>
                            <TableCell className="font-medium">Angsuran BRI</TableCell>
                            <TableCell className="text-right">Rp{expense.installments.bri.toLocaleString('id-ID')}</TableCell>
                            <TableCell>{expense.installments.briTenor}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Angsuran Shopee</TableCell>
                            <TableCell className="text-right">Rp{expense.installments.shopee.toLocaleString('id-ID')}</TableCell>
                            <TableCell>{expense.installments.shopeeTenor} ({expense.installments.shopeeNote})</TableCell>
                        </TableRow>
                    </>
                );
            case 'other':
                return (
                     <TableRow>
                        <TableCell className="font-medium">Biaya Lain-lain</TableCell>
                        <TableCell className="text-right">Rp{expense.otherExpenses.amount.toLocaleString('id-ID')}</TableCell>
                        <TableCell>{expense.otherExpenses.note}</TableCell>
                    </TableRow>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    const title = category ? categoryTitles[category] : "Laporan Pengeluaran";
    const period = from && to 
        ? `${format(parseISO(from), 'd MMM yyyy', { locale: id })} - ${format(parseISO(to), 'd MMM yyyy', { locale: id })}`
        : "Periode tidak valid";

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground">{period}</p>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Rincian Pengeluaran</CardTitle>
                    <CardDescription>
                        Berikut adalah rincian untuk kategori {title.toLowerCase()}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                                <TableHead>Keterangan/Tenor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderCategoryDetails()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
