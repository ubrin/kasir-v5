
'use client';

import * as React from "react";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  addDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Customer, Invoice, Payment } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { differenceInDays, parseISO, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/payment-dialog";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Loader2 } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import Link from "next/link";


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
    const [delinquentCustomersList, setDelinquentCustomersList] = React.useState<DelinquentCustomer[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const fetchDelinquentData = React.useCallback(async () => {
        setLoading(true);
        try {
            const customersSnapshot = await getDocs(collection(db, "customers"));
            const allCustomers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));

            const invoicesQuery = query(collection(db, "invoices"), where("status", "==", "belum lunas"));
            const overdueInvoicesSnapshot = await getDocs(invoicesQuery);
            const overdueInvoices = overdueInvoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
            
            const delinquentCustomersData = overdueInvoices.reduce<Record<string, { customer: Customer; overdueAmount: number; overdueInvoicesCount: number, dueDates: string[], invoices: Invoice[] }>>((acc, invoice) => {
                const customer = allCustomers.find((c) => c.id === invoice.customerId);
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

            const delinquents = Object.values(delinquentCustomersData).map(data => {
                const sortedDueDates = data.dueDates.map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
                const nearestDueDate = sortedDueDates.length > 0 ? sortedDueDates[0].toISOString().split('T')[0] : '';
                
                return {
                    ...data.customer,
                    overdueAmount: data.overdueAmount,
                    overdueInvoicesCount: data.overdueInvoicesCount,
                    nearestDueDate: nearestDueDate,
                    invoices: data.invoices.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
                }
            });

            setDelinquentCustomersList(delinquents);
        } catch (error) {
            console.error("Error fetching delinquent data:", error);
            toast({
                title: "Gagal memuat data",
                description: "Terjadi kesalahan saat mengambil data tagihan.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchDelinquentData();
    }, [fetchDelinquentData]);

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

    const handleInvoiceClick = (e: React.MouseEvent, customerId: string) => {
        e.stopPropagation();
        router.push(`/invoice/${customerId}`);
    };

    const handlePaymentSuccess = async (customerId: string, customerName: string, paymentDetails: any) => {
        
        try {
            const batch = writeBatch(db);

            // 1. Create a new payment document
            const newPaymentRef = doc(collection(db, "payments"));
            const newPayment: Omit<Payment, 'id'> = {
                customerId: customerId,
                customerName: customerName,
                paymentDate: format(paymentDetails.paymentDate, 'yyyy-MM-dd'),
                paidAmount: paymentDetails.paidAmount,
                paymentMethod: paymentDetails.paymentMethod,
                invoiceIds: paymentDetails.selectedInvoices,
                totalBill: paymentDetails.billToPay,
                discount: paymentDetails.discount,
                totalPayment: paymentDetails.totalPayment,
                changeAmount: paymentDetails.changeAmount,
            };
            batch.set(newPaymentRef, newPayment);

            // 2. Update invoice statuses and amounts
            let amountPaid = paymentDetails.paidAmount;
            const totalToPay = paymentDetails.totalPayment;
            
            const selectedInvoicesToProcess = delinquentCustomersList
                .find(c => c.id === customerId)?.invoices
                .filter(inv => paymentDetails.selectedInvoices.includes(inv.id))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];
        
            if (amountPaid >= totalToPay) {
                selectedInvoicesToProcess.forEach(invoice => {
                    const invoiceRef = doc(db, "invoices", invoice.id);
                    batch.update(invoiceRef, { status: 'lunas' });
                });
            } else {
                 for (const invoice of selectedInvoicesToProcess) {
                    const invoiceRef = doc(db, "invoices", invoice.id);
                    if (amountPaid >= invoice.amount) {
                        amountPaid -= invoice.amount;
                        batch.update(invoiceRef, { status: 'lunas' });
                    } else {
                        batch.update(invoiceRef, { amount: invoice.amount - amountPaid });
                        amountPaid = 0;
                        break; 
                    }
                }
            }

            // 3. Update customer's outstanding balance
            const customerRef = doc(db, "customers", customerId);
            batch.update(customerRef, {
                outstandingBalance: increment(-paymentDetails.totalPayment)
            });

            // Commit all changes
            await batch.commit();
        
            toast({
                title: "Pembayaran Berhasil",
                description: `Pembayaran untuk ${customerName} telah berhasil diproses.`,
                action: (
                    <Button asChild variant="secondary" size="sm">
                        <Link href={`/receipt/${newPaymentRef.id}`}>
                            <Receipt className="mr-2 h-4 w-4" /> Lihat Struk
                        </Link>
                    </Button>
                ),
            });
    
            fetchDelinquentData(); // Refresh data
        } catch (error) {
            console.error("Payment processing error:", error);
            toast({
                title: "Pembayaran Gagal",
                description: "Terjadi kesalahan saat memproses pembayaran.",
                variant: "destructive"
            });
        }
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

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Tagihan Pelanggan</h1>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
        
        {isClient && filteredGroupKeys.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={filteredGroupKeys.map(String)}>
                {filteredGroupKeys.map((code) => (
                    <AccordionItem value={String(code)} key={code} className="border rounded-lg overflow-hidden">
                        <AccordionTrigger className="bg-muted/50 hover:bg-muted px-4 sm:px-6 py-4">
                             <CardTitle>Tanggal {code}</CardTitle>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                             <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pelanggan</TableHead>
                                            <TableHead>Alamat</TableHead>
                                            <TableHead className="text-center">Jatuh Tempo</TableHead>
                                            <TableHead className="text-right">Total Tagihan</TableHead>
                                            <TableHead className="text-right pr-6">Aksi</TableHead>
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
                                                    <div className="flex justify-end gap-2 pr-2">
                                                        <Button variant="outline" size="icon" onClick={(e) => handleInvoiceClick(e, customer.id)}>
                                                            <FileText className="h-4 w-4" />
                                                            <span className="sr-only">Buat Invoice</span>
                                                        </Button>
                                                        <PaymentDialog
                                                            customer={customer}
                                                            onPaymentSuccess={handlePaymentSuccess}
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </div>
                             <div className="md:hidden space-y-4 p-4">
                                {groupedDelinquentCustomers[code].map((customer) => (
                                    <Card key={customer.id} onClick={() => handleRowClick(customer.id)} className="cursor-pointer">
                                        <CardContent className="p-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold">{customer.name}</p>
                                                    <p className="text-sm text-muted-foreground">{customer.address}</p>
                                                </div>
                                                {formatDueDateCountdown(customer.nearestDueDate)}
                                            </div>
                                            <div className="border-t pt-3 flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Total Tagihan</p>
                                                    <p className="font-bold text-destructive">Rp{customer.overdueAmount.toLocaleString('id-ID')}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                     <Button variant="outline" size="icon" onClick={(e) => handleInvoiceClick(e, customer.id)}>
                                                        <FileText className="h-4 w-4" />
                                                        <span className="sr-only">Buat Invoice</span>
                                                    </Button>
                                                    <PaymentDialog
                                                        customer={customer}
                                                        onPaymentSuccess={handlePaymentSuccess}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        ) : (
             <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                    {selectedGroup === "all" && isClient ? (
                        <>
                            <p className="text-lg font-medium">Tidak ada tunggakan!</p>
                            <p className="text-muted-foreground">Tidak ada pelanggan yang menunggak saat ini. Kerja bagus!</p>
                        </>
                    ) : isClient ? (
                        <>
                            <p className="text-lg font-medium">Grup Tidak Ditemukan</p>
                            <p className="text-muted-foreground">Tidak ada pelanggan yang menunggak dalam grup yang dipilih.</p>
                        </>
                    ) : null}
                </CardContent>
            </Card>
        )}
    </div>
  )
}
