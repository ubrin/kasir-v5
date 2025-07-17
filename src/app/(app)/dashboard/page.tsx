
'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { DollarSign, Users, CreditCard, Activity, MoreHorizontal, Wallet } from "lucide-react"
import { revenueData, customers, invoices, payments } from "@/lib/data"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { differenceInMonths, getMonth, getYear, parseISO, startOfMonth, endOfMonth, isFuture, isWithinInterval, addDays, formatDistanceToNowStrict } from "date-fns"
import { id } from 'date-fns/locale';

const chartConfig = {
  revenue: {
    label: "Pendapatan",
    color: "hsl(var(--primary))",
  },
}

const pieChartColors = ["hsl(142.1 76.2% 36.3%)", "hsl(0 84.2% 60.2%)"];

export default function DashboardPage() {
    const totalRevenue = invoices.filter(i => i.status === 'lunas').reduce((acc, i) => acc + i.amount, 0);
    const outstandingPayments = invoices.filter(i => i.status === 'belum lunas').reduce((acc, i) => acc + i.amount, 0);
    const newCustomers = customers.filter(c => differenceInMonths(new Date(), new Date(c.installationDate)) <= 1).length;
    const delinquentAccounts = invoices.filter(i => i.status === 'belum lunas' && new Date(i.dueDate) < new Date()).length;

    // Filter invoices for the current month and year for the pie chart
    const today = new Date();
    const currentMonth = getMonth(today);
    const currentYear = getYear(today);

    const currentMonthInvoices = invoices.filter(invoice => {
        const invoiceDate = parseISO(invoice.date);
        return getMonth(invoiceDate) === currentMonth && getYear(invoiceDate) === currentYear;
    });

    const paidInvoicesCurrentMonth = currentMonthInvoices.filter(i => i.status === 'lunas').length;
    const unpaidInvoicesCurrentMonth = currentMonthInvoices.filter(i => i.status === 'belum lunas').length;
    
    const pieData = [
      { name: 'Lunas', value: paidInvoicesCurrentMonth },
      { name: 'Belum Lunas', value: unpaidInvoicesCurrentMonth },
    ];

    // Payment Summary for this month
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);

    const monthlyPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate >= startOfCurrentMonth && paymentDate <= endOfCurrentMonth;
    });

    const paymentSummary = monthlyPayments.reduce(
      (acc, payment) => {
        acc[payment.paymentMethod] += payment.paidAmount;
        acc.total += payment.paidAmount;
        return acc;
      },
      { cash: 0, bri: 0, dana: 0, total: 0 }
    );


  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Dasbor</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pendapatan
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp{totalRevenue.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% dari bulan lalu
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pelanggan Baru
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newCustomers}</div>
            <p className="text-xs text-muted-foreground">
              +180.1% dari bulan lalu
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pembayaran Terutang</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp{outstandingPayments.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              +19% dari bulan lalu
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Akun Menunggak
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{delinquentAccounts}</div>
            <p className="text-xs text-muted-foreground">
              +2 sejak bulan lalu
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Ringkasan Pendapatan</CardTitle>
            <CardDescription>Grafik pendapatan yang diterima selama beberapa bulan terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={revenueData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="month"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    />
                    <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `Rp${new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(value)}`}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                        }}
                        formatter={(value: number) => [`Rp${value.toLocaleString('id-ID')}`, 'Pendapatan']}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Pembayaran Bulan Ini</CardTitle>
            <CardDescription>Ringkasan pembayaran yang diterima bulan ini berdasarkan metode.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Metode Pembayaran</TableHead>
                        <TableHead className="text-right">Total Diterima</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">Cash</TableCell>
                        <TableCell className="text-right">Rp{paymentSummary.cash.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">BRI</TableCell>
                        <TableCell className="text-right">Rp{paymentSummary.bri.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">DANA</TableCell>
                        <TableCell className="text-right">Rp{paymentSummary.dana.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                </TableBody>
                <TableRow className="bg-muted/50 font-bold text-base">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">Rp{paymentSummary.total.toLocaleString('id-ID')}</TableCell>
                </TableRow>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
            <CardHeader>
                <CardTitle>Status Pembayaran Faktur (Bulan Ini)</CardTitle>
                <CardDescription>Visualisasi faktur yang sudah dan belum dibayar bulan ini.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Tooltip
                    contentStyle={{
                        background: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                    }}
                    formatter={(value: number, name: string) => [`${value} Faktur`, name]}
                    />
                    <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                            {`${(percent * 100).toFixed(0)}%`}
                        </text>
                        );
                    }}
                    >
                    {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                    ))}
                    </Pie>
                    <Legend iconType="circle" />
                </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

    

    