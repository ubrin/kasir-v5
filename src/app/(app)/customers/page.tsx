
'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { AddCustomerDialog } from "@/components/add-customer-dialog";
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
  const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleCustomerAdded = (newCustomerData: Omit<Customer, 'id' | 'status' | 'paymentHistory' | 'outstandingBalance' | 'amountDue'>) => {
    const newId = `cus_${Date.now()}`;
    const amountDue = newCustomerData.packagePrice;
    
    const customerToAdd: Customer = {
      ...newCustomerData,
      id: newId,
      status: amountDue > 0 ? 'belum lunas' : 'lunas',
      paymentHistory: 'Pelanggan baru.',
      outstandingBalance: amountDue,
      amountDue: amountDue,
    };
    customers.unshift(customerToAdd);

    // Automatically create the first invoice
    if (amountDue > 0) {
        const today = new Date();
        const dueDate = new Date(today.getFullYear(), today.getMonth() + 1, newCustomerData.dueDateCode);
        const newInvoice: Invoice = {
            id: `INV-${Date.now()}`,
            customerId: newId,
            customerName: newCustomerData.name,
            date: format(today, 'yyyy-MM-dd'),
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            amount: amountDue,
            status: 'belum lunas',
        };
        invoices.unshift(newInvoice);
    }
    
    toast({
        title: "Pelanggan Ditambahkan",
        description: `${newCustomerData.name} telah berhasil ditambahkan dan faktur pertama telah dibuat.`,
    });

    setForceUpdate(prev => prev + 1);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
  };

  const confirmDelete = () => {
    if (!customerToDelete) return;

    // Find and remove customer
    const customerIndex = customers.findIndex(c => c.id === customerToDelete.id);
    if (customerIndex > -1) {
        customers.splice(customerIndex, 1);
    }

    // Find and remove associated invoices
    let i = invoices.length;
    while (i--) {
        if (invoices[i].customerId === customerToDelete.id) {
            invoices.splice(i, 1);
        }
    }

    toast({
        title: "Pelanggan Dihapus",
        description: `${customerToDelete.name} dan semua datanya telah berhasil dihapus.`,
        variant: "destructive",
    });

    setCustomerToDelete(null);
    setForceUpdate(prev => prev + 1);
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
                    <p className="text-lg font-medium">Grup Tidak Ditemukan</p>
                    <p className="text-muted-foreground">Tidak ada pelanggan dalam grup yang dipilih.</p>
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
