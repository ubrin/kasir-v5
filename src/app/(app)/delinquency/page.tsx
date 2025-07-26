
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
import { FileText, Receipt, Loader2, Wallet } from "lucide-react";
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
    hasArrears: boolean; // Has unpaid invoices from previous months
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
            
            const delinquentCustomerIds = new Set(overdueInvoices.map(inv => inv.customerId));
            const startOfCurrentMonth = startOfMonth(new Date());

            const delinquentsMap: Record<string, DelinquentCustomer> = {};

            for (const customerId of Array.from(delinquentCustomerIds)) {
                const customer = allCustomers.find(c => c.id === customerId);
                 if (customer) {
                    const customerInvoices = overdueInvoices.filter(inv => inv.customerId === customerId);
                    if (customerInvoices.length > 0) {
                        const totalInvoiceAmount = customerInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                        const creditBalance = customer.creditBalance ?? 0;
                        const finalOverdueAmount = totalInvoiceAmount - creditBalance;
                        
                        if (finalOverdueAmount > 0) {
                            const sortedDueDates = customerInvoices.map(d => parseISO(d.dueDate)).sort((a, b) => a.getTime() - b.getTime());
                            const nearestDueDate = sortedDueDates.length > 0 ? format(sortedDueDates[0], 'yyyy-MM-dd') : '';
                            
                            const hasArrears = customerInvoices.some(inv => parseISO(inv.date) < startOfCurrentMonth);

                            delinquentsMap[customerId] = {
                                ...customer,
                                overdueAmount: finalOverdueAmount,
                                overdueInvoicesCount: customerInvoices.length,
                                nearestDueDate: nearestDueDate,
                                invoices: customerInvoices.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()),
                                hasArrears: hasArrears,
                            };
                        }
                    }
                }
            }

            const delinquentList = Object.values(delinquentsMap);
            delinquentList.sort((a, b) => {
                const addressComparison = a.address.localeCompare(b.address);
                if (addressComparison !== 0) {
                    return addressComparison;
                }
                return a.name.localeCompare(b.name);
            });
            setDelinquentCustomersList(delinquentList);

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
    
            const selectedInvoicesQuery = query(
                collection(db, "invoices"),
                where("customerId", "==", customerId),
                where("__name__", "in", paymentDetails.selectedInvoices.length > 0 ? paymentDetails.selectedInvoices : ["dummy-id"])
            );
            const invoicesSnapshot = await getDocs(selectedInvoicesQuery);
            const invoicesToPay = invoicesSnapshot.docs
                .map(d => ({ ...d.data(), id: d.id } as Invoice))
                .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
            
            if (invoicesToPay.length === 0) {
                toast({ title: "Tidak ada faktur dipilih", variant: "destructive" });
                return;
            }
            
            const totalBilledAmountToClear = invoicesToPay.reduce((sum, inv) => sum + inv.amount, 0);
            const discountAmount = paymentDetails.discount; 
            const creditUsed = paymentDetails.creditUsed;
            let creditedAmount = paymentDetails.paidAmount + creditUsed + discountAmount;
    
            const newPaymentRef = doc(collection(db, "payments"));
            const newPayment: Omit<Payment, 'id'> = {
                customerId: customerId,
                customerName: customerName,
                paymentDate: format(paymentDetails.paymentDate, 'yyyy-MM-dd'),
                paidAmount: paymentDetails.paidAmount,
                paymentMethod: paymentDetails.paymentMethod,
                invoiceIds: paymentDetails.selectedInvoices,
                totalBill: totalBilledAmountToClear,
                discount: discountAmount,
                totalPayment: paymentDetails.paidAmount,
                changeAmount: Math.max(0, paymentDetails.paidAmount - paymentDetails.totalPayment),
                collectorId: paymentDetails.collectorId,
                collectorName: paymentDetails.collectorName,
            };
            batch.set(newPaymentRef, newPayment);
            
            let allInvoicesPaid = true;
            for (const invoice of invoicesToPay) {
                const invoiceRef = doc(db, "invoices", invoice.id);
                const amountNeededForThisInvoice = invoice.amount;
                
                if (creditedAmount >= amountNeededForThisInvoice) {
                    batch.update(invoiceRef, { status: "lunas" });
                    creditedAmount -= amountNeededForThisInvoice;
                } else {
                    // This logic for partial payment is complex and currently not fully supported by the UI.
                    // For now, we assume full payment of selected invoices.
                    // If partial payment logic were added, this is where it would go.
                    allInvoicesPaid = false; 
                    break;
                }
            }
    
            const customerRef = doc(db, "customers", customerId);
            const customerUpdates: { [key: string]: any } = {};

            const creditChange = newPayment.changeAmount - creditUsed;
            if (creditChange !== 0) {
                customerUpdates.creditBalance = increment(creditChange);
            }
            // Update balance only if there are changes
            if (Object.keys(customerUpdates).length > 0) {
                batch.update(customerRef, customerUpdates);
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
    
            // Instead of refetching, update the state locally
            const remainingOverdueAmount = customer.overdueAmount - paymentDetails.totalPayment;
            
            if (remainingOverdueAmount <= 0 && allInvoicesPaid) {
                 setDelinquentCustomersList(prevList => prevList.filter(c => c.id !== customerId));
            } else {
                // If there's a remaining balance, refetch everything to be safe.
                // This scenario (partial payment) is complex.
                fetchDelinquentData();
            }

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

        if (hasArrears && daysDiff < 0) {
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
        
        {isClient && filteredGroupKeys.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={[]}>
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
                             <div className="md:hidden divide-y">
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
                            <p className="text-lg font-medium">Semua Tagihan Lunas!</p>
                            <p className="text-muted-foreground">Tidak ada pelanggan yang menunggak saat ini. Kerja bagus!</p>
                        </>
                    ) : null}
                </CardContent>
            </Card>
        )}
    </div>
  )
}
