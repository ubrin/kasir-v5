
'use client';

import * as React from "react";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
  increment,
  updateDoc,
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
import { differenceInDays, parseISO, format, startOfToday, startOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/payment-dialog";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Loader2, Wallet, Search, X } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import Link from "next/link";
import { Input } from "@/components/ui/input";


type DelinquentCustomer = Customer & {
    overdueAmount: number;
    overdueInvoicesCount: number;
    nearestDueDate: string;
    invoices: Invoice[];
    hasArrears: boolean; // Has unpaid invoices from previous months
};

export default function DelinquencyPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
    const [isClient, setIsClient] = React.useState(false);
    const [delinquentCustomersList, setDelinquentCustomersList] = React.useState<DelinquentCustomer[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    const fetchDelinquentData = React.useCallback(async () => {
        setLoading(true);
        try {
            const invoicesQuery = query(collection(db, "invoices"), where("status", "==", "belum lunas"));
            const overdueInvoicesSnapshot = await getDocs(invoicesQuery);
            
            if (overdueInvoicesSnapshot.empty) {
                setDelinquentCustomersList([]);
                setLoading(false);
                return;
            }

            const overdueInvoicesByCustomer = new Map<string, Invoice[]>();
            overdueInvoicesSnapshot.docs.forEach(doc => {
                const invoice = { id: doc.id, ...doc.data() } as Invoice;
                const existing = overdueInvoicesByCustomer.get(invoice.customerId) || [];
                existing.push(invoice);
                overdueInvoicesByCustomer.set(invoice.customerId, existing);
            });
            
            const delinquentCustomerIds = Array.from(overdueInvoicesByCustomer.keys());
            if (delinquentCustomerIds.length === 0) {
                 setDelinquentCustomersList([]);
                 setLoading(false);
                 return;
            }

            // Chunk customer IDs to avoid Firestore's 30-item limit for 'in' queries
            const customerIdChunks: string[][] = [];
            for (let i = 0; i < delinquentCustomerIds.length; i += 30) {
                customerIdChunks.push(delinquentCustomerIds.slice(i, i + 30));
            }

            const customerPromises = customerIdChunks.map(chunk => 
                getDocs(query(collection(db, "customers"), where("__name__", "in", chunk)))
            );

            const customerSnapshots = await Promise.all(customerPromises);
            const allCustomers: Customer[] = [];
            customerSnapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    allCustomers.push({ id: doc.id, ...doc.data() } as Customer);
                });
            });


            const startOfCurrentMonth = startOfMonth(new Date());
            const delinquents: DelinquentCustomer[] = [];

            for (const customer of allCustomers) {
                const customerInvoices = overdueInvoicesByCustomer.get(customer.id);
                if (customerInvoices && customerInvoices.length > 0) {
                    const totalInvoiceAmount = customerInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                    const creditBalance = customer.creditBalance ?? 0;
                    const finalOverdueAmount = totalInvoiceAmount - creditBalance;
                    
                    if (finalOverdueAmount > 0) {
                        const sortedDueDates = customerInvoices.map(d => parseISO(d.dueDate)).sort((a, b) => a.getTime() - b.getTime());
                        const nearestDueDate = sortedDueDates.length > 0 ? format(sortedDueDates[0], 'yyyy-MM-dd') : '';
                        const hasArrears = customerInvoices.some(inv => parseISO(inv.date) < startOfCurrentMonth);

                        delinquents.push({
                            ...customer,
                            overdueAmount: finalOverdueAmount,
                            overdueInvoicesCount: customerInvoices.length,
                            nearestDueDate: nearestDueDate,
                            invoices: customerInvoices.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
                            hasArrears: hasArrears,
                        });
                    }
                }
            }

            delinquents.sort((a, b) => {
                const addressComparison = a.address.localeCompare(b.address);
                if (addressComparison !== 0) return addressComparison;
                return a.name.localeCompare(b.name);
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
    
    const filteredDelinquentCustomers = delinquentCustomersList.filter(customer => {
        const searchLower = searchQuery.toLowerCase();
        return (
            customer.name.toLowerCase().includes(searchLower) ||
            customer.address.toLowerCase().includes(searchLower)
        );
    });

    const groupedDelinquentCustomers = filteredDelinquentCustomers.reduce((acc, customer) => {
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
            let amountToDistribute = paymentDetails.paidAmount + paymentDetails.creditUsed + paymentDetails.discount;
            let remainingCreditFromPayment = 0;
    
            const invoicesToPayQuery = query(
                collection(db, "invoices"),
                where("customerId", "==", customerId),
                where("status", "==", "belum lunas"),
                where("__name__", "in", paymentDetails.selectedInvoices.length > 0 ? paymentDetails.selectedInvoices : ["dummy-id"])
            );
            const invoicesSnapshot = await getDocs(invoicesToPayQuery);
            const sortedInvoices = invoicesSnapshot.docs
                .map(d => ({...d.data(), id: d.id} as Invoice))
                .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    
            if (sortedInvoices.length === 0 && paymentDetails.creditUsed === 0) {
                toast({ title: "Tidak ada faktur yang valid untuk dibayar", variant: "destructive" });
                return;
            }
    
            for (const invoice of sortedInvoices) {
                if (amountToDistribute <= 0) break;
    
                const invoiceRef = doc(db, "invoices", invoice.id);
                const paymentForThisInvoice = Math.min(amountToDistribute, invoice.amount);
    
                if (paymentForThisInvoice >= invoice.amount) {
                    batch.update(invoiceRef, { status: "lunas" });
                    amountToDistribute -= invoice.amount;
                } else {
                    batch.update(invoiceRef, { amount: increment(-paymentForThisInvoice) });
                    amountToDistribute = 0;
                }
            }
    
            remainingCreditFromPayment = amountToDistribute;
    
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
                totalPayment: paymentDetails.paidAmount,
                changeAmount: Math.max(0, paymentDetails.paidAmount - paymentDetails.totalPayment),
                collectorId: paymentDetails.collectorId,
                collectorName: paymentDetails.collectorName,
            };
            batch.set(newPaymentRef, newPayment);
            
            const customerRef = doc(db, "customers", customerId);
            const creditChange = remainingCreditFromPayment - paymentDetails.creditUsed;
            if (creditChange !== 0) {
                batch.update(customerRef, { creditBalance: increment(creditChange) });
            }
    
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
            
            fetchDelinquentData();

        } catch (error) {
            console.error("Payment processing error:", error);
            toast({
                title: "Pembayaran Gagal",
                description: "Terjadi kesalahan saat memproses pembayaran.",
                variant: "destructive"
            });
        }
    }

    const formatDueDateCountdown = (dueDate: string, hasArrears: boolean) => {
        if (!isClient || !dueDate) return null;
    
        const today = startOfToday();
        const dueDateParsed = parseISO(dueDate);
        const daysDiff = differenceInDays(dueDateParsed, today);

        if (hasArrears) {
            return <Badge variant="destructive">Menunggak</Badge>;
        }
    
        if (daysDiff < 0) {
          return <Badge variant="destructive">Lewat</Badge>;
        }
        if (daysDiff === 0) {
            return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Jatuh Tempo</Badge>;
        }
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{daysDiff + 1} hari lagi</Badge>;
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

        <div className="relative w-full md:w-1/2 lg:w-1/3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari pelanggan berdasarkan nama atau alamat..."
              className="w-full appearance-none bg-background pl-8 shadow-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
        </div>
        
        {isClient && filteredGroupKeys.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={[]}>
                {filteredGroupKeys.map((code) => (
                    <AccordionItem value={String(code)} key={code} className="border rounded-lg bg-card overflow-hidden">
                        <AccordionTrigger className="bg-muted/50 hover:no-underline px-4 sm:px-6 py-4">
                             <span className="font-semibold text-lg">Tanggal {code}</span>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                             {/* Desktop Table */}
                             <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pelanggan</TableHead>
                                            <TableHead>Alamat</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
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
                                                {formatDueDateCountdown(customer.nearestDueDate, customer.hasArrears)}
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
                             {/* Mobile List */}
                             <div className="md:hidden divide-y divide-border">
                                {groupedDelinquentCustomers[code].map((customer) => (
                                    <div key={customer.id} onClick={() => handleRowClick(customer.id)} className="cursor-pointer p-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold truncate">{customer.name}</p>
                                                <p className="text-sm text-muted-foreground truncate">{customer.address}</p>
                                            </div>
                                            {formatDueDateCountdown(customer.nearestDueDate, customer.hasArrears)}
                                        </div>
                                        <div className="mt-4 pt-3 border-t flex justify-between items-center">
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
                                    </div>
                                ))}
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        ) : (
             <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                    {isClient ? (
                        <>
                            <Wallet className="w-12 h-12 text-muted-foreground" />
                            <p className="text-lg font-medium">
                                {searchQuery ? 'Tidak Ada Hasil' : 'Semua Tagihan Lunas!'}
                            </p>
                            <p className="text-muted-foreground">
                                {searchQuery ? `Tidak ada pelanggan yang cocok dengan pencarian "${searchQuery}".` : 'Tidak ada pelanggan yang menunggak saat ini. Kerja bagus!'}
                            </p>
                        </>
                    ) : null}
                </CardContent>
            </Card>
        )}
    </div>
  )
}
