
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
import type { Customer } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

type DelinquentCustomer = Customer & {
    overdueAmount: number;
    overdueInvoices: number;
};

export default function DelinquencyPage() {
    const router = useRouter();
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
    
    const handleRowClick = (customerId: string) => {
        router.push(`/customers/${customerId}`);
    };

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Tagihan Pelanggan</h1>
            <p className="text-muted-foreground">Pelanggan dengan satu atau lebih faktur yang telah jatuh tempo.</p>
        </div>
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pelanggan</TableHead>
                            <TableHead>Alamat</TableHead>
                            <TableHead className="text-center">Faktur Jatuh Tempo</TableHead>
                            <TableHead className="text-right">Total Tagihan</TableHead>
                            <TableHead className="text-right">
                                <span className="sr-only">Aksi</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {delinquentCustomers.length > 0 ? (
                        delinquentCustomers.map((customer) => (
                            <TableRow 
                                key={customer.id} 
                                onClick={() => handleRowClick(customer.id)}
                                className="cursor-pointer"
                            >
                                <TableCell className="font-semibold">{customer.name}</TableCell>
                                <TableCell>{customer.address}</TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="destructive">{customer.overdueInvoices}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-destructive">
                                    Rp{customer.overdueAmount.toLocaleString('id-ID')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" onClick={(e) => e.stopPropagation()}>Bayar</Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button 
                                                aria-haspopup="true" 
                                                size="icon" 
                                                variant="ghost"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Buka menu</span>
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                                <DropdownMenuItem>Kirim Pengingat</DropdownMenuItem>
                                                <DropdownMenuItem>Lihat Detail Pelanggan</DropdownMenuItem>
                                                <DropdownMenuItem>Hubungi Pelanggan</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-48">
                                    <p className="text-lg font-medium">Tidak ada tunggakan!</p>
                                    <p className="text-muted-foreground">Tidak ada pelanggan yang menunggak saat ini. Kerja bagus!</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  )
}
