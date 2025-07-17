
'use client';
import { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Save, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editableCustomer, setEditableCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!params.id) return;

    const fetchCustomerData = async () => {
        setLoading(true);
        try {
            // Fetch customer details
            const customerDocRef = doc(db, "customers", params.id);
            const customerDocSnap = await getDoc(customerDocRef);

            if (!customerDocSnap.exists()) {
                notFound();
                return;
            }
            const customerData = { id: customerDocSnap.id, ...customerDocSnap.data() } as Customer;
            setCustomer(customerData);
            setEditableCustomer(customerData);

            // Fetch customer invoices
            const invoicesQuery = query(collection(db, "invoices"), where("customerId", "==", params.id));
            const invoicesSnapshot = await getDocs(invoicesQuery);
            const invoicesList = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
            setCustomerInvoices(invoicesList);

        } catch (error) {
            console.error("Error fetching customer data:", error);
            toast({
                title: "Gagal memuat data",
                description: "Tidak dapat mengambil data dari database.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    fetchCustomerData();
  }, [params.id, toast]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditableCustomer(prev => prev ? { ...prev, [id]: id === 'subscriptionMbps' || id === 'packagePrice' || id === 'dueDateCode' ? Number(value) : value } : null);
  };

  const handleSave = async () => {
    if (!editableCustomer) return;
    
    try {
        const customerDocRef = doc(db, "customers", editableCustomer.id);
        // We only update the fields that are editable, preserving others like outstandingBalance
        const { id, outstandingBalance, ...dataToUpdate } = editableCustomer;
        await updateDoc(customerDocRef, dataToUpdate);
        
        setCustomer(editableCustomer); // Update the main state
        toast({
            title: "Data Disimpan",
            description: "Perubahan data pelanggan telah berhasil disimpan."
        });
        setIsEditing(false);
    } catch (error) {
        console.error("Error updating customer:", error);
        toast({
            title: "Gagal Menyimpan",
            description: "Terjadi kesalahan saat menyimpan perubahan.",
            variant: "destructive"
        });
    }
  };

  const handleCancel = () => {
    setEditableCustomer(customer);
    setIsEditing(false);
  }

  const getBadgeClasses = (status: 'lunas' | 'belum lunas', dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'belum lunas';
    switch (status) {
      case 'lunas':
        return 'bg-green-100 text-green-800';
      case 'belum lunas':
        return isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
    }
  };

  const translateStatus = (status: 'lunas' | 'belum lunas', dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'belum lunas';
    switch (status) {
      case 'lunas':
        return 'Lunas';
      case 'belum lunas':
        return isOverdue ? 'Jatuh Tempo' : 'Belum Lunas';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!customer) {
      return notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Kembali ke Pelanggan</span>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Detail Pelanggan</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{isEditing ? "Ubah Detail Pelanggan" : editableCustomer?.name}</CardTitle>
              <CardDescription>ID Pelanggan: {editableCustomer?.id}</CardDescription>
            </div>
            {isEditing ? (
                <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm"><Save className="mr-2 h-4 w-4"/> Simpan</Button>
                    <Button onClick={handleCancel} size="sm" variant="outline"><X className="mr-2 h-4 w-4"/> Batal</Button>
                </div>
            ) : (
                <Button onClick={() => setIsEditing(true)} size="sm" variant="outline"><Edit className="mr-2 h-4 w-4"/> Ubah</Button>
            )}
        </CardHeader>
        <CardContent>
            {isEditing ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama</Label>
                        <Input id="name" value={editableCustomer?.name || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="address">Alamat</Label>
                        <Input id="address" value={editableCustomer?.address || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">No. WhatsApp</Label>
                        <Input id="phone" value={editableCustomer?.phone || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="subscriptionMbps">Paket (Mbps)</Label>
                        <Input id="subscriptionMbps" type="number" value={editableCustomer?.subscriptionMbps || 0} onChange={handleInputChange} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="packagePrice">Harga Paket (Rp)</Label>
                        <Input id="packagePrice" type="number" value={editableCustomer?.packagePrice || 0} onChange={handleInputChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="dueDateCode">Tanggal Jatuh Tempo</Label>
                        <Input id="dueDateCode" type="number" value={editableCustomer?.dueDateCode || 1} onChange={handleInputChange} />
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={editableCustomer?.outstandingBalance ?? 0 > 0 ? "destructive" : "secondary"} className={`${editableCustomer?.outstandingBalance ?? 0 > 0 ? "" : "bg-green-100 text-green-800"} w-fit`}>
                        {editableCustomer?.outstandingBalance ?? 0 > 0 ? "Belum Lunas" : "Lunas"}
                    </Badge>
                    </div>
                    <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Alamat</p>
                    <p>{editableCustomer?.address}</p>
                    </div>
                     <div className="grid gap-1">
                        <p className="text-sm font-medium text-muted-foreground">No. WhatsApp</p>
                        <p>{editableCustomer?.phone || '-'}</p>
                    </div>
                    <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Tanggal Jatuh Tempo</p>
                    <p>Setiap tanggal {editableCustomer?.dueDateCode}</p>
                    </div>
                    <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Harga Paket</p>
                    <p>Rp{editableCustomer?.packagePrice.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Tunggakan</p>
                    <p>Rp{editableCustomer?.outstandingBalance.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="grid gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Tanggal Pemasangan</p>
                        <p>{editableCustomer?.installationDate ? format(parseISO(editableCustomer.installationDate), "d MMMM yyyy", { locale: id }) : '-'}</p>
                    </div>
                    <div className="grid gap-1">
                    <p className="text-sm font-medium text-muted-foreground">Paket</p>
                    <p>{editableCustomer?.subscriptionMbps} Mbps</p>
                    </div>
                    <div className="grid gap-1 col-span-full">
                    <p className="text-sm font-medium text-muted-foreground">Catatan</p>
                    <p className="whitespace-pre-wrap">{editableCustomer?.paymentHistory || '-'}</p>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Riwayat Pembayaran</CardTitle>
          <CardDescription>Rincian pembayaran bulanan untuk {customer.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bulan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerInvoices.length > 0 ? customerInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{format(parseISO(invoice.date), "MMMM yyyy", { locale: id })}</TableCell>
                  <TableCell className="text-right">Rp{invoice.amount.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={getBadgeClasses(invoice.status, invoice.dueDate)}>
                        {translateStatus(invoice.status, invoice.dueDate)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        Tidak ada riwayat pembayaran.
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
