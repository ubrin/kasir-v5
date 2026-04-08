
'use client';

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { Payment, Expense, OtherIncome, Invoice } from "@/lib/types";
import withAuth from "@/components/withAuth";

type MonthDetail = {
    monthName: string;
    year: string;
    totalTarget: number;
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    incomeItems: { name: string; amount: number; date?: string }[];
    expenseItems: { name: string; amount: number; date?: string }[];
};

function MonthlyRecapDetailPage() {
    const params = useParams();
    const router = useRouter();
    const year = params.year as string;
    const monthIndex = parseInt(params.month as string);
    const [loading, setLoading] = React.useState(true);
    const [detail, setMonthDetail] = React.useState<MonthDetail | null>(null);

    React.useEffect(() => {
        const fetchMonthDetail = async () => {
            setLoading(true);
            try {
                const [
                    paymentsSnapshot,
                    expensesSnapshot,
                    otherIncomesSnapshot,
                    invoicesSnapshot,
                ] = await Promise.all([
                    getDocs(collection(db, "payments")),
                    getDocs(query(collection(db, "expenses"), where("date", "!=", null))),
                    getDocs(collection(db, "otherIncomes")),
                    getDocs(collection(db, "invoices")),
                ]);

                const monthName = format(new Date(parseInt(year), monthIndex, 1), 'MMMM', { locale: id });

                // Filter data for specific month and year
                const filterByMonthAndYear = (dateStr: string) => {
                    const d = parseISO(dateStr);
                    return getMonth(d) === monthIndex && getYear(d).toString() === year;
                };

                const monthInvoices = invoicesSnapshot.docs
                    .map(doc => doc.data() as Invoice)
                    .filter(inv => inv.date && filterByMonthAndYear(inv.date));
                
                const totalTarget = monthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

                const monthPayments = paymentsSnapshot.docs
                    .map(doc => doc.data() as Payment)
                    .filter(p => p.paymentDate && filterByMonthAndYear(p.paymentDate));
                
                const totalIncomeFromPayments = monthPayments.reduce((sum, p) => sum + (p.totalPayment || 0), 0);

                const monthOtherIncomes = otherIncomesSnapshot.docs
                    .map(doc => doc.data() as OtherIncome)
                    .filter(oi => oi.date && filterByMonthAndYear(oi.date));
                
                const totalIncomeFromOther = monthOtherIncomes.reduce((sum, oi) => sum + (oi.amount || 0), 0);

                const monthExpenses = expensesSnapshot.docs
                    .map(doc => doc.data() as Expense)
                    .filter(e => e.date && filterByMonthAndYear(e.date));
                
                const totalExpense = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                setMonthDetail({
                    monthName,
                    year,
                    totalTarget,
                    totalIncome: totalIncomeFromPayments + totalIncomeFromOther,
                    totalExpense,
                    netProfit: (totalIncomeFromPayments + totalIncomeFromOther) - totalExpense,
                    incomeItems: [
                        { name: "Total Tagihan Pelanggan (Lunas)", amount: totalIncomeFromPayments },
                        ...monthOtherIncomes.map(oi => ({ name: oi.name, amount: oi.amount, date: oi.date }))
                    ].filter(i => i.amount > 0),
                    expenseItems: monthExpenses.map(e => ({ name: e.name, amount: e.amount || 0, date: e.date }))
                });

            } catch (error) {
                console.error("Failed to fetch monthly detail:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMonthDetail();
    }, [year, monthIndex]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }

    if (!detail) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-muted-foreground">Data tidak ditemukan.</p>
                <Button onClick={() => router.back()} variant="outline">Kembali</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Rincian Laporan</h1>
                    <p className="text-muted-foreground">{detail.monthName} {detail.year}</p>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <Card className="border-green-100 bg-green-50/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">Rp {detail.totalIncome.toLocaleString('id-ID')}</div>
                    </CardContent>
                </Card>
                <Card className="border-red-100 bg-red-50/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">Rp {detail.totalExpense.toLocaleString('id-ID')}</div>
                    </CardContent>
                </Card>
                <Card className="border-blue-100 bg-blue-50/30">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">Rp {detail.netProfit.toLocaleString('id-ID')}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                    <CardHeader className="bg-green-50/50">
                        <div className="flex items-center gap-2 text-green-700">
                            <TrendingUp className="h-5 w-5" />
                            <CardTitle>Rincian Pemasukan</CardTitle>
                        </div>
                        <CardDescription>Semua dana masuk yang tercatat di bulan ini.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Sumber / Nama</TableHead>
                                    <TableHead className="text-right pr-6">Jumlah</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detail.incomeItems.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="pl-6 font-medium">
                                            {item.name}
                                            {item.date && (
                                                <p className="text-[10px] text-muted-foreground font-normal">
                                                    {format(parseISO(item.date), 'dd MMM yyyy')}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-6 font-semibold">
                                            Rp {item.amount.toLocaleString('id-ID')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-muted/30">
                                    <TableCell className="pl-6 font-bold">TOTAL PEMASUKAN</TableCell>
                                    <TableCell className="text-right pr-6 font-bold text-green-600">
                                        Rp {detail.totalIncome.toLocaleString('id-ID')}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="bg-red-50/50">
                        <div className="flex items-center gap-2 text-red-700">
                            <TrendingDown className="h-5 w-5" />
                            <CardTitle>Rincian Pengeluaran</CardTitle>
                        </div>
                        <CardDescription>Semua dana keluar yang tercatat di bulan ini.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Item Pengeluaran</TableHead>
                                    <TableHead className="text-right pr-6">Jumlah</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detail.expenseItems.length > 0 ? (
                                    detail.expenseItems.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="pl-6 font-medium">
                                                {item.name}
                                                {item.date && (
                                                    <p className="text-[10px] text-muted-foreground font-normal">
                                                        {format(parseISO(item.date), 'dd MMM yyyy')}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-semibold">
                                                Rp {item.amount.toLocaleString('id-ID')}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                            Tidak ada data pengeluaran tercatat.
                                        </TableCell>
                                    </TableRow>
                                )}
                                <TableRow className="bg-muted/30">
                                    <TableCell className="pl-6 font-bold">TOTAL PENGELUARAN</TableCell>
                                    <TableCell className="text-right pr-6 font-bold text-red-600">
                                        Rp {detail.totalExpense.toLocaleString('id-ID')}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-blue-600 text-white shadow-xl">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between p-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full">
                            <Wallet className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-sm font-medium opacity-80 uppercase tracking-widest">TOTAL LABA BERSIH</p>
                            <p className="text-xs opacity-70">{detail.monthName} {detail.year}</p>
                        </div>
                    </div>
                    <div className="text-4xl font-black">
                        Rp {detail.netProfit.toLocaleString('id-ID')}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default withAuth(MonthlyRecapDetailPage);
