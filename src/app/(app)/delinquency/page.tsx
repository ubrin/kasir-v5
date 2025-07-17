
'use client';

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { customers, invoices } from "@/lib/data"
import type { Customer, Invoice } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { differenceInDays, parseISO, getMonth, getYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/payment-dialog";


type DelinquentCustomer = Customer & {
    overdueAmount: number;
    overdueInvoicesCount: number;
    nearestDueDate: string;
    invoices: Invoice[];
};

export default function DelinquencyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
    const [isClient, setIsClient] = React.useState(false);
    const [forceUpdate, setForceUpdate] = React.useState(0);
    
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const today = new Date();
    const showDelinquencyList = today.getDate() >= 1;

    let delinquentCustomersList: DelinquentCustomer[] = [];

    if (showDelinquencyList) {
        const overdueInvoices = invoices.filter((invoice) => invoice.status === 'belum lunas');
        
        const delinquentCustomersData = overdueInvoices.reduce<Record<string, { customer: Customer; overdueAmount: number; overdueInvoicesCount: number, dueDates: string[], invoices: Invoice[] }>>((acc, invoice) => {
            const customer = customers.find((c) => c.id === invoice.customerId);
            if (customer) {
                if (!acc[customer.id]) {
                    acc[customer.id] = {
                        customer: customer,
                        overdueAmount: 0,
                        overdueInvoicesCount: 0,
                        dueDates: [],
                        invoices: [],
                    };
                }
                acc[customer.id].overdueAmount += invoice.amount;
                acc[customer.id].overdueInvoicesCount += 1;
                acc[customer.id].dueDates.push(invoice.dueDate);
                acc[customer.id].invoices.push(invoice);
            }
            return acc;
        }, {});

        delinquentCustomersList = Object.values(delinquentCustomersData).map(data => {
            const sortedDueDates = data.dueDates.map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
            const nearestDueDate = sortedDueDates.length > 0 ? sortedDueDates[0].toISOString().split('T')[0] : '';
            
            return {
                ...data.customer,
                overdueAmount: data.overdueAmount,
                overdueInvoicesCount: data.overdueInvoicesCount,
                nearestDueDate: nearestDueDate,
                invoices: data.invoices,
            }
        });
    }

    const groupedDelinquentCustomers = delinquentCustomersList.reduce((acc, customer) => {
        const code = customer.dueDateCode;
        if (!acc[code]) {
          acc[code] = [];
        }
        acc[code].push(customer);
        return acc;
      }, {} as Record<number, DelinquentCustomer[]>);

    const groupKeys = Object.keys(groupedDelinquentCustomers).map(Number).sort((a, b) => a - b);

    const filteredGroupKeys = selectedGroup === "all" 
        ? groupKeys 
        : groupKeys.filter(key => key.toString() === selectedGroup);
    
    const handleRowClick = (customerId: string) => {
        router.push(`/customers/${customerId}`);
    };

    const handlePaymentSuccess = (customerId: string, customerName: string, paymentDetails: any) => {
        const now = new Date();
        const currentMonth = getMonth(now);
        const currentYear = getYear(now);

        invoices.forEach(invoice => {
            if (invoice.customerId === customerId && invoice.status === 'belum lunas') {
                if (paymentDetails.paymentType === 'all') {
                    invoice.status = 'lunas';
                } else if (paymentDetails.paymentType === 'current') {
                    const invoiceDate = parseISO(invoice.date);
                    if (getMonth(invoiceDate) === currentMonth && getYear(invoiceDate) === currentYear) {
                        invoice.status = 'lunas';
                    }
                }
            }
        });

        // Update the customer's balance
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            const remainingArrears = invoices
                .filter(i => i.customerId === customerId && i.status === 'belum lunas')
                .reduce((sum, i) => sum + i.amount, 0);

            customer.amountDue = remainingArrears;
            customer.outstandingBalance = remainingArrears;
            if (remainingArrears === 0) {
                customer.status = 'lunas';
            }
        }

        toast({
            title: "Pembayaran Berhasil",
            description: `Pembayaran untuk ${customerName} telah berhasil diproses.`,
        });

        setForceUpdate(prev => prev + 1);
    }

    const formatDueDateCountdown = (dueDate: string) => {
        if (!isClient || !dueDate) return null;
        const daysDiff = differenceInDays(parseISO(dueDate), new Date());

        if (daysDiff < 0) {
            return <Badge variant="destructive">Jatuh Tempo</Badge>
        }
        if (daysDiff === 0) {
            return <Badge variant="outline" className="bg-blue-100 text-blue-800">Hari Ini</Badge>
        }
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">{daysDiff + 1} hari lagi</Badge>
    }

  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Tagihan Pelanggan</h1>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Pilih grup" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Grup</SelectItem>
                        {groupKeys.map(key => (
                            <SelectItem key={key} value={key.toString()}>
                                Tanggal {key}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        {isClient && filteredGroupKeys.length > 0 ? (
            filteredGroupKeys.map((code) => (
                <Card key={code}>
                    <CardHeader>
                        <CardTitle>Tanggal {code}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pelanggan</TableHead>
                                <TableHead>Alamat</TableHead>
                                <TableHead className="text-center">Jatuh Tempo</TableHead>
                                <TableHead className="text-right">Total Tagihan</TableHead>
                                <TableHead><span className="sr-only">Aksi</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedDelinquentCustomers[code].map((customer) => (
                                <TableRow 
                                    key={customer.id} 
                                    onClick={() => handleRowClick(customer.id)}
                                    className="cursor-pointer"
                                >
                                    <TableCell className="font-semibold">{customer.name}</TableCell>
                                    <TableCell>{customer.address}</TableCell>
                                    <TableCell className="text-center">
                                       {formatDueDateCountdown(customer.nearestDueDate)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-destructive">
                                        Rp{customer.overdueAmount.toLocaleString('id-ID')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <PaymentDialog
                                            customer={customer}
                                            onPaymentSuccess={handlePaymentSuccess}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))
        ) : (
             <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 gap-2">
                    {isClient && !showDelinquencyList ? (
                        <>
                            <p className="text-lg font-medium">Daftar Tagihan Belum Tersedia</p>
                            <p className="text-muted-foreground">Daftar tagihan akan muncul mulai tanggal 1 setiap bulan.</p>
                        </>
                    ) : selectedGroup === "all" && isClient ? (
                        <>
                            <p className="text-lg font-medium">Tidak ada tunggakan!</p>
                            <p className="text-muted-foreground">Tidak ada pelanggan yang menunggak saat ini. Kerja bagus!</p>
                        </>
                    ) : isClient ? (
                        <>
                            <p className="text-lg font-medium">Grup Tidak Ditemukan</p>
                            <p className="text-muted-foreground">Tidak ada pelanggan yang menunggak dalam grup yang dipilih.</p>
                        </>
                    ) : (
                        <p className="text-lg font-medium">Memuat data...</p>
                    )}
                </CardContent>
            </Card>
        )}
    </div>
  )
}
