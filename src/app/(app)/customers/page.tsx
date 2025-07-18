
'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, doc, deleteDoc, writeBatch, query, where } from "firebase/firestore";
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
import { MoreHorizontal, Loader2 } from "lucide-react"
import type { Customer, Invoice } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { format } from 'date-fns';

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchCustomers = React.useCallback(async () => {
    setLoading(true);
    try {
      const customersCollection = collection(db, "customers");
      const customersSnapshot = await getDocs(customersCollection);
      const customersList = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersList);
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

  const handleCustomerAdded = async (newCustomerData: Omit<Customer, 'id' | 'outstandingBalance' | 'paymentHistory'>) => {
    const amountDue = newCustomerData.packagePrice;
    
    const customerToAdd = {
      ...newCustomerData,
      outstandingBalance: amountDue,
      paymentHistory: `Didaftarkan pada ${format(new Date(), 'dd/MM/yyyy')}`
    };

    try {
        const docRef = await addDoc(collection(db, "customers"), customerToAdd);
        
        // Automatically create the first invoice
        if (amountDue > 0) {
            const today = new Date();
            const dueDate = new Date(today.getFullYear(), today.getMonth(), newCustomerData.dueDateCode);
            // If the due date for this month has already passed, set it for next month
            if (dueDate < today) {
                dueDate.setMonth(dueDate.getMonth() + 1);
            }

            const newInvoice: Omit<Invoice, 'id'> = {
                customerId: docRef.id,
                customerName: newCustomerData.name,
                date: format(today, 'yyyy-MM-dd'),
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                amount: amountDue,
                status: 'belum lunas',
            };
            await addDoc(collection(db, "invoices"), newInvoice);
        }
        
        toast({
            title: "Pelanggan Ditambahkan",
            description: `${newCustomerData.name} telah berhasil ditambahkan dan faktur pertama telah dibuat.`,
        });

        fetchCustomers(); // Refresh the list
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
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    try {
        const batch = writeBatch(db);

        // Delete customer document
        const customerDocRef = doc(db, "customers", customerToDelete.id);
        batch.delete(customerDocRef);

        // Find and delete associated invoices
        const invoicesQuery = query(collection(db, "invoices"), where("customerId", "==", customerToDelete.id));
        const invoicesSnapshot = await getDocs(invoicesQuery);
        invoicesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Find and delete associated payments
        const paymentsQuery = query(collection(db, "payments"), where("customerId", "==", customerToDelete.id));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        paymentsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();

        toast({
            title: "Pelanggan Dihapus",
            description: `${customerToDelete.name} dan semua datanya telah berhasil dihapus.`,
            variant: "destructive",
        });

        setCustomerToDelete(null);
        fetchCustomers(); // Refresh list
    } catch (error) {
        console.error("Error deleting customer and associated data:", error);
        toast({
            title: "Gagal Menghapus",
            description: "Terjadi kesalahan saat menghapus data pelanggan.",
            variant: "destructive",
        });
    }
  };


  const groupedCustomers = customers.reduce((acc, customer) => {
    const code = customer.dueDateCode;
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(customer);
    return acc;
  }, {} as Record<number, Customer[]>);

  const groupKeys = Object.keys(groupedCustomers).map(Number).sort((a, b) => a - b);
  
  const filteredGroupKeys = selectedGroup === "all" 
    ? groupKeys 
    : groupKeys.filter(key => key.toString() === selectedGroup);

  const handleRowClick = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };
  
  const handleImportSuccess = () => {
    toast({
      title: "Impor Berhasil",
      description: "Data pelanggan telah berhasil diimpor dari file CSV.",
    });
    fetchCustomers();
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

        {filteredGroupKeys.length > 0 ? (
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
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden md:table-cell">Paket</TableHead>
                            <TableHead className="hidden sm:table-cell">Alamat</TableHead>
                            <TableHead className="text-right">Harga</TableHead>
                            <TableHead>
                                <span className="sr-only">Aksi</span>
                            </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groupedCustomers[code].map((customer) => (
                                <TableRow 
                                    key={customer.id} 
                                    onClick={() => handleRowClick(customer.id)}
                                    className="cursor-pointer"
                                >
                                    <TableCell className="font-semibold">
                                        {customer.name}
                                    </TableCell>
                                    <TableCell>
                                    <Badge variant={customer.outstandingBalance > 0 ? "destructive" : "secondary"} className={`${customer.outstandingBalance > 0 ? "" : "bg-green-100 text-green-800"}`}>
                                        {customer.outstandingBalance > 0 ? "Belum Lunas" : "Lunas"}
                                    </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{customer.subscriptionMbps} Mbps</TableCell>
                                    <TableCell className="hidden sm:table-cell">{customer.address}</TableCell>
                                    <TableCell className="text-right">Rp{customer.packagePrice.toLocaleString('id-ID')}</TableCell>
                                    <TableCell>
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
                <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                    <p className="text-lg font-medium">Tidak Ada Pelanggan</p>
                    <p className="text-muted-foreground">Mulai dengan menambahkan pelanggan baru atau impor dari file.</p>
                </CardContent>
            </Card>
        )}

        <AlertDialog open={!!customerToDelete} onOpenChange={(isOpen) => !isOpen && setCustomerToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus pelanggan?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data pelanggan <span className="font-bold">{customerToDelete?.name}</span> secara permanen beserta semua riwayat fakturnya.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Batal</AlertDialogCancel>
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
