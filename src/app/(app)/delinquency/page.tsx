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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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
      <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Pelanggan Menunggak</h1>
      </div>
      <Card>
          <CardHeader>
              <CardTitle>Daftar Pelanggan Menunggak</CardTitle>
              <CardDescription>Pelanggan dengan satu atau lebih faktur yang telah jatuh tempo.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Total Tunggakan</TableHead>
                  <TableHead className="hidden md:table-cell">Faktur Jatuh Tempo</TableHead>
                  <TableHead className="hidden md:table-cell">Alamat</TableHead>
                  <TableHead>
                      <span className="sr-only">Aksi</span>
                  </TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {delinquentCustomers.length > 0 ? (
                    delinquentCustomers.map((customer) => (
                    <TableRow key={customer.id} className="bg-destructive/5 hover:bg-destructive/10">
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                                <Avatar className="hidden h-9 w-9 sm:flex">
                                    <AvatarImage src={customer.avatar} alt="Avatar" />
                                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-0.5">
                                    <p className="font-semibold">{customer.name}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="text-right text-destructive font-bold">
                            Rp{customer.overdueAmount.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center">
                            <Badge variant="destructive">{customer.overdueInvoices}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{customer.address}</TableCell>
                        <TableCell>
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
                        </TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                            Tidak ada pelanggan yang menunggak saat ini. Kerja bagus!
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
