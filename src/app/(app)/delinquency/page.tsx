
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { customers, invoices } from "@/lib/data"
import type { Customer, Invoice } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

type DelinquentCustomer = Customer & {
    overdueAmount: number;
    overdueInvoices: number;
};

export default function DelinquencyPage() {
    const overdueInvoices = invoices.filter((invoice) => invoice.status === 'belum lunas' && new Date(invoice.dueDate) < new Date());
    
    const delinquentCustomersData = overdueInvoices.reduce<Record<string, { customer: Customer; overdueAmount: number; overdueInvoices: number }>>((acc, invoice) => {
        const customer = customers.find((c) => c.id === invoice.customerId);
        if (customer) {
            if (!acc[customer.id]) {
                acc[customer.id] = {
                    customer: customer,
                    overdueAmount: 0,
                    overdueInvoices: 0,
                };
            }
            acc[customer.id].overdueAmount += invoice.amount;
            acc[customer.id].overdueInvoices += 1;
        }
        return acc;
    }, {});

    const delinquentCustomers: DelinquentCustomer[] = Object.values(delinquentCustomersData).map(data => ({
        ...data.customer,
        overdueAmount: data.overdueAmount,
        overdueInvoices: data.overdueInvoices,
    }));

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Tagihan Pelanggan</h1>
            <p className="text-muted-foreground">Pelanggan dengan satu atau lebih faktur yang telah jatuh tempo.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {delinquentCustomers.length > 0 ? (
            delinquentCustomers.map((customer) => (
                <Card key={customer.id} className="flex flex-col bg-destructive/5">
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle>{customer.name}</CardTitle>
                            <CardDescription>{customer.address}</CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Buka menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                <DropdownMenuItem>Kirim Pengingat</DropdownMenuItem>
                                <DropdownMenuItem>Lihat Faktur</DropdownMenuItem>
                                <DropdownMenuItem>Hubungi Pelanggan</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total Tagihan</span>
                                <span className="font-bold text-destructive">Rp{customer.overdueAmount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Faktur Jatuh Tempo</span>
                                <Badge variant="destructive">{customer.overdueInvoices}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))
            ) : (
                <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center h-48 gap-2">
                        <p className="text-lg font-medium">Tidak ada tunggakan!</p>
                        <p className="text-muted-foreground">Tidak ada pelanggan yang menunggak saat ini. Kerja bagus!</p>
                    </CardContent>
                </Card>
            )}
        </div>
    </div>
  )
}
