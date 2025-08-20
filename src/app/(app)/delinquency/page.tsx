
'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Search, FileText, X } from "lucide-react";
import type { Customer, Invoice } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { PaymentDialog } from "@/components/payment-dialog";
import { format, parseISO, startOfMonth, differenceInDays, startOfToday } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type DelinquentCustomer = Customer & {
  totalUnpaid: number;
  invoices: Invoice[];
  nearestDueDate?: string;
  hasArrears: boolean;
};

export default function DelinquencyPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [customers, setCustomers] = React.useState<DelinquentCustomer[]>([]);
  const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchDelinquentData = React.useCallback(async () => {
    setLoading(true);
    try {
      const customersCollection = collection(db, "customers");
      const invoicesUnpaidQuery = query(collection(db, "invoices"), where("status", "==", "belum lunas"));

      const [customersSnapshot, unpaidInvoicesSnapshot] = await Promise.all([
        getDocs(customersCollection),
        getDocs(unpaidInvoicesQuery),
      ]);

      const allCustomers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      const customerMap = new Map(allCustomers.map(c => [c.id, c]));
      
      const unpaidInvoices = unpaidInvoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));

      const delinquentCustomersMap = new Map<string, DelinquentCustomer>();
      const startOfCurrent = startOfMonth(new Date());

      for (const invoice of unpaidInvoices) {
        const customer = customerMap.get(invoice.customerId);
        if (!customer) continue;

        if (!delinquentCustomersMap.has(customer.id)) {
          delinquentCustomersMap.set(customer.id, {
            ...customer,
            totalUnpaid: 0,
            invoices: [],
            hasArrears: false,
          });
        }

        const delinquentCustomer = delinquentCustomersMap.get(customer.id)!;
        delinquentCustomer.invoices.push(invoice);
        delinquentCustomer.totalUnpaid += invoice.amount;
        
        // Check for arrears (unpaid invoices from *before* the start of the current month)
        if (parseISO(invoice.date) < startOfCurrent) {
            delinquentCustomer.hasArrears = true;
        }
      }

      const delinquentCustomersList = Array.from(delinquentCustomersMap.values()).map(customer => {
        // Sort invoices by date to find the nearest due date accurately
        customer.invoices.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
        
        const nearestDueDate = customer.invoices.length > 0 ? customer.invoices[0].dueDate : undefined;
            
        return {...customer, nearestDueDate};
      });

      // Sort customers by address
      delinquentCustomersList.sort((a, b) => a.address.localeCompare(b.address));

      setCustomers(delinquentCustomersList);

    } catch (error) {
      console.error("Error fetching delinquency data:", error);
      toast({
        title: "Gagal memuat data tunggakan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchDelinquentData();
  }, [fetchDelinquentData]);

  const handlePaymentSuccess = () => {
    toast({
      title: 'Pembayaran Berhasil',
      description: 'Data pembayaran telah berhasil disimpan.',
    });
    fetchDelinquentData();
  };

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    const searchMatch =
        customer.name.toLowerCase().includes(searchLower) ||
        customer.address.toLowerCase().includes(searchLower);
    return searchMatch;
  });

  const groupedCustomers = filteredCustomers.reduce((acc, customer) => {
    const code = customer.dueDateCode;
    if (!acc[code]) acc[code] = [];
    acc[code].push(customer);
    return acc;
  }, {} as Record<number, DelinquentCustomer[]>);

  const groupKeys = Object.keys(groupedCustomers).map(Number).sort((a, b) => a - b);
  const filteredGroupKeys = selectedGroup === "all" ? groupKeys : groupKeys.filter(key => key.toString() === selectedGroup);

  const formatDueDateStatus = (dueDate?: string, hasArrears?: boolean) => {
    if (!isClient) return null;
    
    // Arrears take the highest priority. If they have old debt, always show "Menunggak".
    if (hasArrears) {
      return <Badge variant="destructive">Menunggak</Badge>;
    }
    
    if (!dueDate) return null; // Should not happen in this page as we only show unpaid
    
    const daysDiff = differenceInDays(parseISO(dueDate), startOfToday());
  
    // For bills due this month that are past their due date
    if (daysDiff < 0) return <Badge variant="outline" className="border-red-500 text-red-500">Lewat</Badge>;
    if (daysDiff === 0) return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Jatuh Tempo</Badge>;
    return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{daysDiff + 1} hari lagi</Badge>;
  };
  
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
        <div className="flex items-center gap-2">
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

        {filteredGroupKeys.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={filteredGroupKeys.map(String)}>
                {filteredGroupKeys.map((code) => {
                    const groupCustomers = groupedCustomers[code];
                    if (!groupCustomers || groupCustomers.length === 0) return null;
                    return (
                        <AccordionItem value={String(code)} key={code} className="border rounded-lg bg-card overflow-hidden">
                            <AccordionTrigger className="bg-muted/50 hover:no-underline px-4 sm:px-6 py-3 font-semibold text-lg">
                                Tanggal {code}
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                               <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/30 hidden md:table-header-group">
                                            <tr className="border-b">
                                                <th className="p-4 text-left font-medium text-muted-foreground">Pelanggan</th>
                                                <th className="p-4 text-left font-medium text-muted-foreground">Alamat</th>
                                                <th className="p-4 text-left font-medium text-muted-foreground">Status</th>
                                                <th className="p-4 text-right font-medium text-muted-foreground">Total Tagihan</th>
                                                <th className="p-4 text-center font-medium text-muted-foreground">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border md:divide-y-0">
                                            {groupCustomers.map((customer) => (
                                                <tr key={customer.id} className="flex flex-col p-4 md:table-row md:p-0">
                                                    <td className="md:p-4 font-medium flex justify-between items-center">
                                                        <span>{customer.name}</span>
                                                        <div className="md:hidden">
                                                            {formatDueDateStatus(customer.nearestDueDate, customer.hasArrears)}
                                                        </div>
                                                    </td>
                                                    <td className="md:p-4 text-muted-foreground text-xs md:text-sm">{customer.address}</td>
                                                    <td className="hidden md:table-cell md:p-4">{formatDueDateStatus(customer.nearestDueDate, customer.hasArrears)}</td>
                                                    <td className="md:p-4 md:text-right font-semibold text-destructive pt-2 md:pt-4">
                                                        <div className="flex justify-between items-center">
                                                            <span className="md:hidden text-muted-foreground font-normal">Total Tagihan</span>
                                                            <span>Rp{customer.totalUnpaid.toLocaleString('id-ID')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="md:p-4 md:text-center pt-4 md:pt-4">
                                                        <div className="flex justify-end md:justify-center gap-2">
                                                            <Button asChild variant="outline" size="icon" onClick={(e) => e.stopPropagation()}>
                                                                <Link href={`/invoice/${customer.id}`}>
                                                                    <FileText className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <PaymentDialog customer={customer} onPaymentSuccess={handlePaymentSuccess} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        ) : (
             <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                    <p className="text-lg font-medium">Tidak Ada Tagihan</p>
                    <p className="text-muted-foreground">Tidak ada pelanggan dengan tagihan belum lunas yang cocok dengan filter Anda.</p>
                </CardContent>
            </Card>
        )}
    </div>
  );
}

    