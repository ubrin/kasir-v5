'use client';

import * as React from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Wallet, Users, FileClock, DollarSign, BookText, Coins, ArrowRight, PieChartIcon, Wifi, ChevronRight, CalendarDays, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { format, isSameMonth, isSameYear, isThisMonth, parseISO, startOfMonth, getMonth, getYear } from "date-fns";
import { id } from "date-fns/locale";
import type { Payment, Expense, OtherIncome, Customer, Invoice } from "@/lib/types";
import { InfoDialog } from "@/components/info-dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  PieChart,
  Pie,
  Cell,
} from "recharts"
import withAuth from "@/components/withAuth";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator";

type OmsetGroup = {
  price: number;
  count: number;
  total: number;
  customers: { name: string; address: string }[];
};

type MonthlyRecap = {
  monthName: string;
  target: number;
  income: number;
  expense: number;
  net: number;
  incomeDetails: { name: string; amount: number }[];
  expenseDetails: { name: string; amount: number }[];
};

type Stats = {
  monthlyIncome: number;
  monthlyExpense: number;
  netProfit: number;
  totalOmset: number;
  totalArrears: number;
  newCustomersCount: number;
  totalCustomers: number;
  omsetGroups: OmsetGroup[];
  newCustomers: Pick<Customer, 'name' | 'address'>[];
  delinquentCustomers: { name: string; amount: number }[];
  monthlyIncomeFromPayments: number;
  monthlyIncomeFromOther: number;
  monthlyIncomeByMethod: {
      cash: number;
      bri: number;
      dana: number;
  };
  monthlyExpenseByCategory: Record<string, number>;
  invoiceStatusThisMonth: {
      lunasCount: number;
      lunasAmount: number;
      belumLunasCount: number;
      belumLunasAmount: number;
  };
  monthlyRecap: MonthlyRecap[];
};

const chartConfig = {
  lunas: {
    label: "Lunas",
    color: "hsl(var(--chart-2))",
  },
  belumLunas: {
    label: "Belum Lunas",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig

function FinancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<Stats | null>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [
          paymentsSnapshot,
          expensesSnapshot,
          otherIncomesSnapshot,
          customersSnapshot,
          invoicesSnapshot,
        ] = await Promise.all([
          getDocs(collection(db, "payments")),
          getDocs(query(collection(db, "expenses"), where("date", "!=", null))),
          getDocs(collection(db, "otherIncomes")),
          getDocs(collection(db, "customers")),
          getDocs(collection(db, "invoices")),
        ]);

        const today = new Date();
        const currentYear = getYear(today);
        const startOfCurrentMonth = startOfMonth(today);

        const allInvoices = invoicesSnapshot.docs.map(doc => doc.data() as Invoice);
        const thisMonthInvoices = allInvoices.filter(inv => inv.date && isThisMonth(parseISO(inv.date)));

        const invoiceStatusThisMonth = thisMonthInvoices.reduce((acc, inv) => {
            if (inv.status === 'lunas') {
                acc.lunasCount += 1;
                acc.lunasAmount += inv.amount;
            } else {
                acc.belumLunasCount += 1;
                acc.belumLunasAmount += inv.amount;
            }
            return acc;
        }, { lunasCount: 0, lunasAmount: 0, belumLunasCount: 0, belumLunasAmount: 0 });

        const allPayments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
        const thisMonthPayments = allPayments.filter(p => p.paymentDate && isThisMonth(parseISO(p.paymentDate)));
        
        const monthlyIncomeFromPayments = thisMonthPayments.reduce((sum, p) => sum + (p.totalPayment || 0), 0);

        const monthlyIncomeByMethod = thisMonthPayments.reduce((acc, payment) => {
            const method = payment.paymentMethod;
            acc[method] = (acc[method] || 0) + (payment.totalPayment || 0);
            return acc;
        }, { cash: 0, bri: 0, dana: 0 });

        const allOtherIncomes = otherIncomesSnapshot.docs.map(doc => doc.data() as OtherIncome);
        const thisMonthOtherIncomes = allOtherIncomes.filter(oi => oi.date && isThisMonth(parseISO(oi.date)));
            
        const monthlyIncomeFromOther = thisMonthOtherIncomes.reduce((sum, oi) => sum + (oi.amount || 0), 0);
        const monthlyIncome = monthlyIncomeFromPayments + monthlyIncomeFromOther;

        const allExpenses = expensesSnapshot.docs.map(doc => doc.data() as Expense);
        const thisMonthExpenses = allExpenses.filter(e => e.date && isThisMonth(parseISO(e.date)));
            
        const monthlyExpense = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        const monthlyExpenseByCategory = thisMonthExpenses.reduce((acc, expense) => {
            const categoryName = expense.category === 'utama' ? 'Wajib' : expense.category.charAt(0).toUpperCase() + expense.category.slice(1);
            acc[categoryName] = (acc[categoryName] || 0) + (expense.amount || 0);
            return acc;
        }, {} as Record<string, number>);
        
        const customersList = customersSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Customer));
        const newCustomers = customersList.filter(c => c.installationDate && isThisMonth(parseISO(c.installationDate)));
        
        const unpaidInvoices = allInvoices.filter(inv => inv.status === 'belum lunas');
        const oldUnpaidInvoices = unpaidInvoices
            .filter(inv => inv.date && parseISO(inv.date) < startOfCurrentMonth);
            
        const totalArrears = oldUnpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

        const delinquentCustomersMap = new Map<string, {name: string, amount: number}>();
        for (const invoice of oldUnpaidInvoices) {
            const customer = customersList.find(c => c.id === invoice.customerId);
            if(customer) {
                const current = delinquentCustomersMap.get(customer.id) || {name: customer.name, amount: 0};
                current.amount += invoice.amount;
                delinquentCustomersMap.set(customer.id, current);
            }
        }

        const totalOmset = customersList.reduce((sum, c) => sum + (c.packagePrice || 0), 0);

        const omsetGroupsMap = new Map<number, OmsetGroup>();
        customersList.forEach(customer => {
            const price = customer.packagePrice || 0;
            const current = omsetGroupsMap.get(price) || { price, count: 0, total: 0, customers: [] };
            current.count += 1;
            current.total += price;
            current.customers.push({ name: customer.name, address: customer.address });
            omsetGroupsMap.set(price, current);
        });

        const omsetGroups = Array.from(omsetGroupsMap.values()).sort((a, b) => b.price - a.price);

        // --- CALCULATION FOR MONTHLY RECAP TABLE ---
        const monthlyRecap: MonthlyRecap[] = [];
        for (let i = 0; i < 12; i++) {
            const monthName = format(new Date(currentYear, i, 1), 'MMMM', { locale: id });
            
            const target = allInvoices
                .filter(inv => {
                    const d = parseISO(inv.date);
                    return getMonth(d) === i && getYear(d) === currentYear;
                })
                .reduce((sum, inv) => sum + (inv.amount || 0), 0);

            const monthPayments = allPayments
                .filter(p => {
                    const d = parseISO(p.paymentDate);
                    return getMonth(d) === i && getYear(d) === currentYear;
                });
            const monthIncomeFromPayments = monthPayments.reduce((sum, p) => sum + (p.totalPayment || 0), 0);

            const monthOtherIncomes = allOtherIncomes
                .filter(oi => {
                    const d = parseISO(oi.date);
                    return getMonth(d) === i && getYear(d) === currentYear;
                });
            const monthIncomeFromOther = monthOtherIncomes.reduce((sum, oi) => sum + (oi.amount || 0), 0);

            const monthExpenses = allExpenses
                .filter(e => {
                    const d = parseISO(e.date!);
                    return getMonth(d) === i && getYear(d) === currentYear;
                });
            const monthExpenseTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

            monthlyRecap.push({
                monthName,
                target,
                income: monthIncomeFromPayments + monthIncomeFromOther,
                expense: monthExpenseTotal,
                net: (monthIncomeFromPayments + monthIncomeFromOther) - monthExpenseTotal,
                incomeDetails: [
                    { name: "Tagihan Pelanggan (Lunas)", amount: monthIncomeFromPayments },
                    ...monthOtherIncomes.map(oi => ({ name: oi.name, amount: oi.amount }))
                ].filter(d => d.amount > 0),
                expenseDetails: monthExpenses.map(e => ({ name: e.name, amount: e.amount || 0 })).filter(d => d.amount > 0)
            });
        }

        setStats({
          monthlyIncome,
          monthlyExpense,
          netProfit: monthlyIncome - monthlyExpense,
          totalOmset,
          totalArrears,
          newCustomersCount: newCustomers.length,
          totalCustomers: customersList.length,
          omsetGroups,
          newCustomers: newCustomers.map(c => ({name: c.name, address: c.address})),
          delinquentCustomers: Array.from(delinquentCustomersMap.values()),
          monthlyIncomeFromPayments,
          monthlyIncomeFromOther,
          monthlyIncomeByMethod,
          monthlyExpenseByCategory,
          invoiceStatusThisMonth,
          monthlyRecap
        });

      } catch (error) {
        console.error("Failed to fetch stats:", error);
        toast({
          title: "Gagal memuat data",
          description: "Tidak dapat mengambil data keuangan.",
          variant: "destructive",
        });
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [toast]);
  
  const chartData = React.useMemo(() => {
    if (!stats) return [];
    return [
      { status: "lunas", count: stats.invoiceStatusThisMonth.lunasCount, total: stats.invoiceStatusThisMonth.lunasAmount, fill: "var(--color-lunas)" },
      { status: "belumLunas", count: stats.invoiceStatusThisMonth.belumLunasCount, total: stats.invoiceStatusThisMonth.belumLunasAmount, fill: "var(--color-belumLunas)" },
    ].filter(d => d.count > 0);
  }, [stats]);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Gagal memuat statistik. Coba segarkan halaman.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1"></div>
        <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
                <Link href="/other-incomes">Input Pemasukan Lain <Coins className="ml-2 h-4 w-4"/></Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/expenses">Input Pengeluaran <TrendingDown className="ml-2 h-4 w-4"/></Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/reports">Total Keuangan <BookText className="ml-2 h-4 w-4"/></Link>
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Keuangan Bulan Ini</CardTitle>
          <CardDescription>Pemasukan, pengeluaran, dan laba bersih yang tercatat bulan ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 sm:grid-cols-3">
            <InfoDialog
              title="Rincian Pemasukan Bulan Ini"
              description="Berikut adalah rincian sumber pemasukan yang tercatat bulan ini."
              trigger={
                <div className="flex items-center gap-4 cursor-pointer">
                  <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pemasukan</p>
                    <p className="text-2xl font-bold">Rp{stats.monthlyIncome.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              }
            >
              <ul className="space-y-4">
                <li className="space-y-2 pb-2">
                  <span className="font-semibold text-base">Pembayaran Pelanggan</span>
                  <ul className="space-y-1 pl-4 text-sm">
                    <li className="flex justify-between items-center">
                      <span>- Cash</span>
                      <span>Rp{stats.monthlyIncomeByMethod.cash.toLocaleString('id-ID')}</span>
                    </li>
                     <li className="flex justify-between items-center">
                      <span>- BRI</span>
                      <span>Rp{stats.monthlyIncomeByMethod.bri.toLocaleString('id-ID')}</span>
                    </li>
                     <li className="flex justify-between items-center">
                      <span>- DANA</span>
                      <span>Rp{stats.monthlyIncomeByMethod.dana.toLocaleString('id-ID')}</span>
                    </li>
                  </ul>
                  <div className="flex justify-between items-center font-medium pt-1 border-t">
                    <span>Subtotal Pembayaran</span>
                    <span>Rp{stats.monthlyIncomeFromPayments.toLocaleString('id-ID')}</span>
                  </div>
                </li>
                <li className="flex justify-between items-center text-sm pt-2 border-t">
                  <span className="font-semibold text-base">Pemasukan Lainnya</span>
                  <span className="font-semibold">Rp{stats.monthlyIncomeFromOther.toLocaleString('id-ID')}</span>
                </li>
              </ul>
            </InfoDialog>

            <InfoDialog
              title="Rincian Pengeluaran Bulan Ini"
              description="Berikut adalah rincian pengeluaran berdasarkan kategori yang tercatat bulan ini."
              trigger={
                <div className="flex items-center gap-4 cursor-pointer">
                  <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pengeluaran</p>
                    <p className="text-2xl font-bold">Rp{stats.monthlyExpense.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              }
            >
              <ul className="space-y-2">
                {Object.keys(stats.monthlyExpenseByCategory).length > 0 ? (
                    Object.entries(stats.monthlyExpenseByCategory).map(([category, amount]) => (
                    <li key={category} className="flex justify-between items-center text-sm border-b pb-2">
                        <span>{category}</span>
                        <span className="font-semibold">Rp{amount.toLocaleString('id-ID')}</span>
                    </li>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center">Belum ada pengeluaran bulan ini.</p>
                )}
              </ul>
            </InfoDialog>

            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Laba Bersih</p>
                <p className="text-2xl font-bold">Rp{stats.netProfit.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoDialog
          title=""
          description=""
          trigger={
            <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Omset Potensial</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Rp{stats.totalOmset.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground mt-1">Total dari semua paket pelanggan</p>
              </CardContent>
            </Card>
          }
        >
          <div className="flex flex-col gap-6 py-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sky-500">
                <Wifi className="h-6 w-6" />
                <h2 className="text-xl font-bold">Rincian Omset Paket</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Daftar rincian harga paket langganan saat ini.
              </p>
            </div>

            <Accordion type="single" collapsible className="flex flex-col gap-3">
              {stats.omsetGroups.map((group, idx) => (
                <AccordionItem value={`item-${idx}`} key={idx} className="border-none">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/30 px-5 py-4 transition-all hover:bg-blue-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">HARGA PAKET</span>
                        <span className="text-xl font-extrabold text-blue-600">
                          Rp {group.price.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-blue-600 hover:bg-blue-700 px-3 py-0.5 text-[10px] font-bold rounded-full text-white">
                            {group.count} Org
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Total: Rp {group.total.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <AccordionTrigger className="p-0 hover:no-underline [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-muted-foreground" />
                      </div>
                    </div>
                    <AccordionContent className="pt-4 border-t border-blue-100 mt-4">
                      <ul className="grid grid-cols-1 gap-2">
                        {group.customers.map((c, cIdx) => (
                          <li key={cIdx} className="text-xs flex flex-col border-b border-blue-50 pb-2 last:border-0 last:pb-0">
                            <span className="font-semibold text-blue-900">{c.name}</span>
                            <span className="text-muted-foreground text-[10px]">{c.address}</span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </div>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg flex justify-between items-center mt-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">TOTAL OMSET</span>
                <span className="text-xs font-medium opacity-90">{stats.totalCustomers} Pelanggan</span>
              </div>
              <span className="text-2xl font-black">
                Rp {stats.totalOmset.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </InfoDialog>

        <InfoDialog
            title="Pelanggan Baru Bulan Ini"
            description={`Terdapat ${stats.newCustomers.length} pelanggan baru yang terdaftar bulan ini.`}
            trigger={
                <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pelanggan Baru Bulan Ini</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.newCustomersCount}</div>
                        <p className="text-xs text-muted-foreground">Pelanggan baru bulan ini</p>
                    </CardContent>
                </Card>
            }
        >
            <ul className="space-y-3">
                {stats.newCustomers.length > 0 ? (
                    stats.newCustomers.map((customer, index) => (
                    <li key={index} className="text-sm border-b pb-2">
                        <p className="font-semibold">{customer.name}</p>
                        <p className="text-muted-foreground">{customer.address}</p>
                    </li>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center">Belum ada pelanggan baru bulan ini.</p>
                )}
            </ul>
        </InfoDialog>
        
        <InfoDialog
          title="Pelanggan Menunggak"
          description="Daftar pelanggan dengan tagihan belum lunas dari bulan-bulan sebelumnya."
          trigger={
             <Card className="h-full cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tunggakan</CardTitle>
                  <FileClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">Rp{stats.totalArrears.toLocaleString('id-ID')}</div>
                  <p className="text-xs text-muted-foreground">Total tagihan belum lunas dari bulan lalu</p>
              </CardContent>
            </Card>
          }
        >
          <ul className="space-y-3">
            {stats.delinquentCustomers.length > 0 ? (
                stats.delinquentCustomers.map((customer, index) => (
                <li key={index} className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="font-semibold">{customer.name}</span>
                    <span className="text-destructive font-medium">Rp{customer.amount.toLocaleString('id-ID')}</span>
                </li>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center">Tidak ada tunggakan dari bulan sebelumnya.</p>
            )}
          </ul>
        </InfoDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         <Card>
            <CardHeader>
              <CardTitle>Status Faktur Bulan Ini</CardTitle>
              <CardDescription>Visualisasi faktur yang sudah dan belum dibayar bulan ini.</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square h-[250px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const label = chartConfig[data.status as keyof typeof chartConfig].label;
                          return (
                            <div className="min-w-[15rem] rounded-lg border bg-background p-2.5 text-sm shadow-sm">
                              <p className="font-medium">{`${label} (${data.count} Faktur)`}</p>
                              <p className="text-muted-foreground">Rp{data.total.toLocaleString('id-ID')}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Pie
                      data={chartData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={60}
                      labelLine={false}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry) => (
                          <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[250px] text-center">
                    <PieChartIcon className="w-12 h-12 text-muted-foreground" />
                    <p className="mt-4 font-medium">Tidak ada data faktur bulan ini.</p>
                </div>
              )}
            </CardContent>
          </Card>
      </div>

      {/* RECAPITULATION TABLE SECTION */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
            <CalendarDays className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex flex-col">
            <CardTitle className="text-xl">Tabel Rekapitulasi</CardTitle>
            <CardDescription>
              Performa keuangan per bulan tahun {getYear(new Date())}. Klik pada nama bulan untuk melihat rincian.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold text-foreground py-4">Bulan</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Target</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Pemasukan</TableHead>
                  <TableHead className="font-bold text-foreground py-4">Pengeluaran</TableHead>
                  <TableHead className="font-bold text-foreground text-right py-4">Total Bersih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.monthlyRecap.map((recap, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/20">
                    <TableCell className="font-bold py-4">
                        <InfoDialog
                            title={`Rincian ${recap.monthName} ${getYear(new Date())}`}
                            description="Berikut adalah ringkasan pemasukan dan pengeluaran bulan ini."
                            trigger={
                                <div className="flex items-center gap-2 cursor-pointer text-blue-600 hover:underline">
                                    {recap.monthName}
                                    <ChevronRight className="h-3 w-3" />
                                </div>
                            }
                        >
                            <div className="space-y-6 py-2">
                                <div>
                                    <h3 className="font-bold text-green-600 flex items-center gap-2 mb-3">
                                        <TrendingUp className="h-4 w-4" /> Pemasukan
                                    </h3>
                                    <ul className="space-y-2">
                                        {recap.incomeDetails.length > 0 ? (
                                            recap.incomeDetails.map((item, iIdx) => (
                                                <li key={iIdx} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0">
                                                    <span className="text-muted-foreground">{item.name}</span>
                                                    <span className="font-medium text-foreground">Rp{item.amount.toLocaleString('id-ID')}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">Tidak ada pemasukan tercatat.</p>
                                        )}
                                    </ul>
                                    {recap.incomeDetails.length > 0 && (
                                        <div className="flex justify-between items-center mt-3 pt-2 border-t font-bold text-sm">
                                            <span>Total Pemasukan</span>
                                            <span className="text-green-600">Rp{recap.income.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="font-bold text-red-500 flex items-center gap-2 mb-3">
                                        <TrendingDown className="h-4 w-4" /> Pengeluaran
                                    </h3>
                                    <ul className="space-y-2">
                                        {recap.expenseDetails.length > 0 ? (
                                            recap.expenseDetails.map((item, eIdx) => (
                                                <li key={eIdx} className="flex justify-between items-center text-sm border-b border-dashed pb-2 last:border-0">
                                                    <span className="text-muted-foreground">{item.name}</span>
                                                    <span className="font-medium text-foreground">Rp{item.amount.toLocaleString('id-ID')}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">Tidak ada pengeluaran tercatat.</p>
                                        )}
                                    </ul>
                                    {recap.expenseDetails.length > 0 && (
                                        <div className="flex justify-between items-center mt-3 pt-2 border-t font-bold text-sm">
                                            <span>Total Pengeluaran</span>
                                            <span className="text-red-500">Rp{recap.expense.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </InfoDialog>
                    </TableCell>
                    <TableCell className="font-bold text-blue-600 py-4">
                      Rp {recap.target.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="font-bold text-green-600 py-4">
                      Rp {recap.income.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="font-bold text-red-500 py-4">
                      Rp {recap.expense.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600 text-right py-4">
                      Rp {recap.net.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(FinancePage);
