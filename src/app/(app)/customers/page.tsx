
'use client';

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs, writeBatch, doc, query, where } from "firebase/firestore";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Loader2, Trash2 } from "lucide-react"
import type { Customer, Invoice } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { AddCustomerDialog } from "@/components/add-customer-dialog";
import { ImportCustomerDialog } from "@/components/import-customer-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { format, parseISO, startOfMonth, differenceInCalendarMonths, addMonths, getDate, startOfToday, differenceInDays } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

type CustomerWithStatus = Customer & {
    nearestDueDate?: string;
    hasArrears?: boolean;
};

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<CustomerWithStatus[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [customersToDelete, setCustomersToDelete] = React.useState<Customer[]>([]);
  const [isClient, setIsClient] = React.useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    try {
      const customersCollection = collection(db, "customers");
      const invoicesUnpaidQuery = query(collection(db, "invoices"), where("status", "==", "belum lunas"));

      const [customersSnapshot, unpaidInvoicesSnapshot] = await Promise.all([
        getDocs(customersCollection),
        getDocs(invoicesUnpaidQuery),
      ]);

      const customersList = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      customersList.sort((a, b) => {
        const addressComparison = a.address.localeCompare(b.address);
        if (addressComparison !== 0) {
            return addressComparison;
        }
        return a.name.localeCompare(b.name);
      });

      const unpaidInvoicesByCustomer = new Map<string, Invoice[]>();
      unpaidInvoicesSnapshot.docs.forEach(doc => {
          const invoice = doc.data() as Invoice;
          const existing = unpaidInvoicesByCustomer.get(invoice.customerId) || [];
          existing.push(invoice);
          unpaidInvoicesByCustomer.set(invoice.customerId, existing);
      });
      
      const startOfCurrentMonth = startOfMonth(new Date());

      const customersWithStatus: CustomerWithStatus[] = customersList.map(customer => {
        const customerInvoices = unpaidInvoicesByCustomer.get(customer.id);
        if (!customerInvoices || customerInvoices.length === 0) {
            return { ...customer, hasArrears: false, nearestDueDate: undefined };
        }
        
        const hasArrears = customerInvoices.some(inv => parseISO(inv.date) < startOfCurrentMonth);

        const nearestDueDate = customerInvoices
            .map(inv => inv.dueDate)
            .sort((a,b) => new Date(a).getTime() - new Date(b).getTime())[0];
        
        return { ...customer, nearestDueDate, hasArrears };
      });

      setCustomers(customersWithStatus);

    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Gagal Memuat Data",
        description: "Tidak dapat mengambil data pelanggan dari database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCustomerAdded = async (newCustomerData: Omit<Customer, 'id' | 'outstandingBalance' | 'paymentHistory' | 'creditBalance'>) => {
    try {
        const batch = writeBatch(db);
        const customerRef = doc(collection(db, "customers"));

        const installationDate = parseISO(newCustomerData.installationDate);
        const today = new Date();
        const startOfCurrentMonth = startOfMonth(today);
        
        const dueDateInInstallationMonth = new Date(installationDate.getFullYear(), installationDate.getMonth(), newCustomerData.dueDateCode);
        
        let firstInvoiceMonth = startOfMonth(installationDate);
        if (installationDate > dueDateInInstallationMonth) {
          firstInvoiceMonth = addMonths(firstInvoiceMonth, 1);
        }
        
        let totalInvoices = 0;
        if (firstInvoiceMonth <= startOfCurrentMonth) {
            totalInvoices = differenceInCalendarMonths(startOfCurrentMonth, firstInvoiceMonth) + 1;
        }

        const totalOutstanding = totalInvoices * newCustomerData.packagePrice;

        const customerToAdd: Omit<Customer, 'id'> = {
            ...newCustomerData,
            outstandingBalance: totalOutstanding,
            paymentHistory: `Didaftarkan pada ${format(new Date(), 'dd/MM/yyyy')}`,
            creditBalance: 0,
        };

        batch.set(customerRef, customerToAdd);

        if (newCustomerData.packagePrice > 0 && totalInvoices > 0) {
            for (let i = 0; i < totalInvoices; i++) {
                const invoiceMonthDate = addMonths(firstInvoiceMonth, i);
                const invoiceDueDate = new Date(invoiceMonthDate.getFullYear(), invoiceMonthDate.getMonth(), newCustomerData.dueDateCode);

                const newInvoice: Omit<Invoice, 'id'> = {
                    customerId: customerRef.id,
                    customerName: newCustomerData.name,
                    date: format(invoiceMonthDate, 'yyyy-MM-dd'),
                    dueDate: format(invoiceDueDate, 'yyyy-MM-dd'),
                    amount: newCustomerData.packagePrice,
                    status: 'belum lunas',
                };
                const invoiceRef = doc(collection(db, "invoices"));
                batch.set(invoiceRef, newInvoice);
            }
        }
        
        await batch.commit();

        toast({
            title: "Pelanggan Ditambahkan",
            description: `${newCustomerData.name} telah berhasil ditambahkan dan ${totalInvoices} faktur telah dibuat.`,
        });

        fetchCustomers();
    } catch (error) {
        console.error("Error adding customer: ", error);
        toast({
            title: "Gagal Menambahkan Pelanggan",
            description: "Terjadi kesalahan saat menyimpan data pelanggan baru.",
            variant: "destructive",
        });
    }
  };


  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setCustomersToDelete([]);
  };

  const handleBulkDeleteClick = () => {
    const toDelete = customers.filter(c => selectedCustomerIds.includes(c.id));
    if (toDelete.length > 0) {
      setCustomersToDelete(toDelete);
      setCustomerToDelete(null);
    }
  };

  const confirmDelete = async () => {
    const toDelete = customerToDelete ? [customerToDelete] : customersToDelete;
    if (toDelete.length === 0) return;

    try {
      const batch = writeBatch(db);
      
      for (const customer of toDelete) {
        const customerDocRef = doc(db, "customers", customer.id);
        batch.delete(customerDocRef);

        const invoicesQuery = query(collection(db, "invoices"), where("customerId", "==", customer.id));
        const invoicesSnapshot = await getDocs(invoicesQuery);
        invoicesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const paymentsQuery = query(collection(db, "payments"), where("customerId", "==", customer.id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        paymentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
      }

      await batch.commit();

      toast({
          title: `Berhasil Menghapus ${toDelete.length} Pelanggan`,
          description: `Data pelanggan telah dihapus secara permanen.`,
          variant: "destructive",
      });

      setCustomerToDelete(null);
      setCustomersToDelete([]);
      setSelectedCustomerIds([]);
      fetchCustomers();
    } catch (error) {
        console.error("Error deleting customer and associated data:", error);
        toast({
            title: "Gagal Menghapus",
            description: "Terjadi kesalahan saat menghapus data pelanggan.",
            variant: "destructive",
        });
    }
  };

  const searchQuery = searchParams.get('q') || '';
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase();
    return (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.address.toLowerCase().includes(searchLower)
    );
  });

  const groupedCustomers = filteredCustomers.reduce((acc, customer) => {
    const code = customer.dueDateCode;
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(customer);
    return acc;
  }, {} as Record<number, CustomerWithStatus[]>);

  const groupKeys = Object.keys(groupedCustomers).map(Number).sort((a, b) => a - b);
  
  const filteredGroupKeys = selectedGroup === "all" 
    ? groupKeys 
    : groupKeys.filter(key => key.toString() === selectedGroup);

  const handleRowClick = (customerId: string, e: React.MouseEvent) => {
    // Prevent navigation if a checkbox or dropdown is clicked
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[role="menu"]')) {
        return;
    }
    router.push(`/customers/${customerId}`);
  };
  
  const handleImportSuccess = () => {
    toast({
      title: "Impor Berhasil",
      description: "Data pelanggan telah berhasil diimpor dari file.",
    });
    fetchCustomers();
  };

  const formatDueDateStatus = (dueDate?: string, hasArrears?: boolean) => {
    if (!isClient) return null;
  
    // If there's no due date, it means no unpaid invoices exist, so the customer is considered paid up.
    if (!dueDate) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Lunas</Badge>;
    }
  
    // If there are arrears from previous months, show "Menunggak" regardless of the nearest due date.
    if (hasArrears) {
      return <Badge variant="destructive">Menunggak</Badge>;
    }
  
    const daysDiff = differenceInDays(parseISO(dueDate), startOfToday());
  
    if (daysDiff < 0) {
      return <Badge variant="destructive">Lewat</Badge>;
    }
    if (daysDiff === 0) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Jatuh Tempo</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">{daysDiff + 1} hari lagi</Badge>;
  }

  const handleSelectOne = (id: string, isChecked: boolean) => {
    setSelectedCustomerIds(prev =>
      isChecked ? [...prev, id] : prev.filter(cid => cid !== id)
    );
  };

  const handleSelectGroup = (groupCustomerIds: string[], isChecked: boolean) => {
    setSelectedCustomerIds(prev => {
      const otherIds = prev.filter(id => !groupCustomerIds.includes(id));
      return isChecked ? [...otherIds, ...groupCustomerIds] : otherIds;
    });
  };

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    );
  }

  const renderActionsMenu = (customer: CustomerWithStatus) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button 
            aria-haspopup="true" 
            size="icon" 
            variant="ghost"
        >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Buka menu</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>Ubah</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/invoice/${customer.id}`)}>Lihat Faktur</DropdownMenuItem>
        <DropdownMenuItem 
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
            onClick={() => handleDeleteClick(customer)}
        >
            Hapus
        </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Pelanggan</h1>
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
                <ImportCustomerDialog onSuccess={handleImportSuccess} />
                <AddCustomerDialog onCustomerAdded={handleCustomerAdded} />
            </div>
        </div>
        
        {selectedCustomerIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">{selectedCustomerIds.length} pelanggan dipilih</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDeleteClick}>
                    <Trash2 className="mr-2 h-4 w-4" /> Hapus Terpilih
                </Button>
            </div>
        )}

        {searchQuery && (
            <div className="text-sm text-muted-foreground">
                Menampilkan {filteredCustomers.length} hasil untuk pencarian <span className="font-semibold text-foreground">"{searchQuery}"</span>.
                <Button variant="link" className="p-1 h-auto" onClick={() => router.push('/customers')}>Hapus filter</Button>
            </div>
        )}


        {filteredGroupKeys.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={[]}>
                {filteredGroupKeys.map((code) => {
                    const groupCustomerIds = groupedCustomers[code].map(c => c.id);
                    const isAllSelectedInGroup = groupCustomerIds.every(id => selectedCustomerIds.includes(id));

                    return (
                        <AccordionItem value={String(code)} key={code} className="border rounded-lg bg-card overflow-hidden">
                            <div className="bg-muted/50 flex items-center px-4 sm:px-6 py-2">
                                <div onClick={(e) => e.stopPropagation()} className="pr-4">
                                     <Checkbox
                                        checked={isAllSelectedInGroup}
                                        onCheckedChange={(isChecked) => handleSelectGroup(groupCustomerIds, !!isChecked)}
                                        aria-label="Pilih semua di grup ini"
                                    />
                                </div>
                                <AccordionTrigger className="hover:no-underline p-0 flex-1">
                                    <span className="font-semibold text-lg">Tanggal {code}</span>
                                </AccordionTrigger>
                            </div>
                            <AccordionContent className="p-0">
                                {/* Desktop Table */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12"></TableHead>
                                                <TableHead>Pelanggan</TableHead>
                                                <TableHead>Alamat</TableHead>
                                                <TableHead>Paket</TableHead>
                                                <TableHead className="text-right">Harga</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>
                                                    <span className="sr-only">Aksi</span>
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {groupedCustomers[code].map((customer) => (
                                                <TableRow 
                                                    key={customer.id} 
                                                    onClick={(e) => handleRowClick(customer.id, e)}
                                                    className="cursor-pointer"
                                                >
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedCustomerIds.includes(customer.id)}
                                                            onCheckedChange={(isChecked) => handleSelectOne(customer.id, !!isChecked)}
                                                            aria-label={`Pilih ${customer.name}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-semibold">{customer.name}</TableCell>
                                                    <TableCell>{customer.address}</TableCell>
                                                    <TableCell>{customer.subscriptionMbps} Mbps</TableCell>
                                                    <TableCell className="text-right">Rp{customer.packagePrice.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell>
                                                        {formatDueDateStatus(customer.nearestDueDate, customer.hasArrears)}
                                                    </TableCell>
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        {renderActionsMenu(customer)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile List */}
                                <div className="md:hidden divide-y divide-border">
                                    {groupedCustomers[code].map((customer) => (
                                        <div key={customer.id} className="p-4">
                                            <div 
                                                onClick={(e) => handleRowClick(customer.id, e)} 
                                                className="cursor-pointer flex items-start justify-between"
                                            >
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={selectedCustomerIds.includes(customer.id)}
                                                            onCheckedChange={(isChecked) => handleSelectOne(customer.id, !!isChecked)}
                                                            aria-label={`Pilih ${customer.name}`}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold truncate">{customer.name}</p>
                                                        <p className="text-sm text-muted-foreground truncate">{customer.address}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 ml-2">
                                                    {formatDueDateStatus(customer.nearestDueDate, customer.hasArrears)}
                                                    <div onClick={(e) => e.stopPropagation()}>{renderActionsMenu(customer)}</div>
                                                </div>
                                            </div>
                                             <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                                                <span>{customer.subscriptionMbps} Mbps</span> - <span>Rp{customer.packagePrice.toLocaleString('id-ID')}</span>
                                             </div>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })
            }
            </Accordion>
        ) : (
             <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                    <p className="text-lg font-medium">{searchQuery ? "Tidak Ada Hasil" : "Tidak Ada Pelanggan"}</p>
                    <p className="text-muted-foreground">{searchQuery ? `Tidak ada pelanggan yang cocok dengan pencarian "${searchQuery}".` : "Mulai dengan menambahkan pelanggan baru atau impor dari file."}</p>
                </CardContent>
            </Card>
        )}

        <AlertDialog open={!!customerToDelete || customersToDelete.length > 0} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setCustomerToDelete(null);
                setCustomersToDelete([]);
            }
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                <AlertDialogDescription>
                    {customersToDelete.length > 1 
                        ? `Tindakan ini akan menghapus data ${customersToDelete.length} pelanggan secara permanen, beserta semua riwayat fakturnya.`
                        : `Tindakan ini akan menghapus data pelanggan ${customerToDelete?.name} secara permanen beserta semua riwayat fakturnya.`
                    }
                    Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                    onClick={confirmDelete}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Ya, Hapus
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  )
}
