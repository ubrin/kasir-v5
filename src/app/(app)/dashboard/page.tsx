'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign, Users, CreditCard, Activity, MoreHorizontal } from "lucide-react"
import { revenueData, customers, invoices } from "@/lib/data"
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
import { differenceInMonths } from "date-fns"

const chartConfig = {
  revenue: {
    label: "Pendapatan",
    color: "hsl(var(--primary))",
  },
}

export default function DashboardPage() {
    const totalRevenue = invoices.filter(i => i.status === 'lunas').reduce((acc, i) => acc + i.amount, 0);
    const outstandingPayments = invoices.filter(i => i.status === 'belum lunas').reduce((acc, i) => acc + i.amount, 0);
    const newCustomers = customers.filter(c => differenceInMonths(new Date(), new Date(c.installationDate)) <= 1).length;
    const delinquentAccounts = invoices.filter(i => i.status === 'belum lunas' && new Date(i.dueDate) < new Date()).length;

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
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
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
      </div>
    </div>
  )
}
