
'use client';
import { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Customer, Invoice, Payment } from "@/lib/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const { id: customerId } = params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUnpaidInvoices, setHasUnpaidInvoices] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editableCustomer, setEditableCustomer] = useState<Customer | null>(null);
  const [editableInvoices, setEditableInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!customerId) return;

    const fetchCustomerData = async () => {
        setLoading(true);
        try {
            // Fetch all data in parallel
            const customerDocRef = doc(db, "customers", customerId);
            const allInvoicesQuery = query(collection(db, "invoices"), where("customerId", "==", customerId));
            const paymentsQuery = query(collection(db, "payments"), where("customerId", "==", customerId));

            const [customerDocSnap, invoicesSnapshot, paymentsSnapshot] = await Promise.all([
                getDoc(customerDocRef),
                getDocs(allInvoicesQuery),
                getDocs(paymentsQuery)
            ]);

            // Process customer
            if (!customerDocSnap.exists()) {
                notFound();
                return;
            }
            const customerData = { id: customerDocSnap.id, ...customerDocSnap.data() } as Customer;
            setCustomer(customerData);
            setEditableCustomer(customerData);

            // Process invoices
            const invoicesList = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
            setCustomerInvoices(invoicesList);
            setEditableInvoices(invoicesList);

            // Check for unpaid invoices
            const unpaidCheck = invoicesList.some(invoice => invoice.status === 'belum lunas');
            setHasUnpaidInvoices(unpaidCheck);

            // Process payments
            const paymentsList = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)).sort((a,b) => parseISO(b.paymentDate).getTime() - parseISO(a.paymentDate).getTime());
            setCustomerPayments(paymentsList);

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
  }, [customerId, toast]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditableCustomer(prev => prev ? { ...prev, [id]: id === 'subscriptionMbps' || id === 'packagePrice' || id === 'dueDateCode' || id === 'creditBalance' ? Number(value) : value } : null);
  };
  
  const handleInvoiceStatusChange = (invoiceId: string, newStatus: 'lunas' | 'belum lunas') => {
    setEditableInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: newStatus } : inv));
  };


  const handleSave = async () => {
    if (!editableCustomer) return;
    
    try {
        const batch = writeBatch(db);
        const customerDocRef = doc(db, "customers", editableCustomer.id);
        
        // We only update the fields that are editable, preserving others like outstandingBalance
        const { id, outstandingBalance, paymentHistory, ...dataToUpdate } = editableCustomer;
        batch.update(customerDocRef, dataToUpdate);

        // Update invoices statuses
        editableInvoices.forEach(invoice => {
            const originalInvoice = customerInvoices.find(orig => orig.id === invoice.id);
            if (originalInvoice && originalInvoice.status !== invoice.status) {
                const invoiceDocRef = doc(db, "invoices", invoice.id);
                batch.update(invoiceDocRef, { status: invoice.status });
            }
        });
        
        await batch.commit();
        
        setCustomer(editableCustomer); // Update the main state for customer
        setCustomerInvoices(editableInvoices); // Update main state for invoices
        
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
    setEditableInvoices(customerInvoices);
    setIsEditing(false);
  }

  const getInvoiceBadgeClasses = (status: 'lunas' | 'belum lunas', dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'belum lunas';
    switch (status) {
      case 'lunas':
        return 'bg-green-100 text-green-800';
      case 'belum lunas':
        return isOverdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
    }
  };

  const translateInvoiceStatus = (status: 'lunas' | 'belum lunas', dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'belum lunas';
    switch (status) {
      case 'lunas':
        return 'Lunas';
      case 'belum lunas':
        return isOverdue ? 'Jatuh Tempo' : 'Belum Lunas';
    }
  };

  const getMethodBadge = (method: 'cash' | 'bri' | 'dana') => {
    switch(method) {
        case 'cash': return <Badge variant="secondary">Cash</Badge>;
        case 'bri': return <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI</Badge>;
        case 'dana': return <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA</Badge>;
    }
  }

  const calculatedArrears = customerInvoices
    .filter(invoice => invoice.status === 'belum lunas')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

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
  
  const hasArrears = calculatedArrears > 0;
  const hasCredit = (editableCustomer?.creditBalance ?? 0) > 0;


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
                     <div className="grid gap-2">
                        <Label htmlFor="creditBalance">Saldo (Rp)</Label>
                        <Input id="creditBalance" type="number" value={editableCustomer?.creditBalance || ''} onChange={handleInputChange} />
                    </div>
                </div>
            ) : (
                <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", (hasArrears && hasCredit) ? "lg:grid-cols-4" : (hasArrears || hasCredit) ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
                    <div className="grid gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <Badge variant={hasUnpaidInvoices ? "destructive" : "secondary"} className={`${hasUnpaidInvoices ? "" : "bg-green-100 text-green-800"} w-fit`}>
                            {hasUnpaidInvoices ? "Belum Lunas" : "Lunas"}
                        </Badge>
                    </div>
                    {hasArrears && (
                        <div className="grid gap-1">
                            <p className="text-sm font-medium text-muted-foreground">Tunggakan</p>
                            <p className="font-semibold text-destructive">Rp{calculatedArrears.toLocaleString('id-ID')}</p>
                        </div>
                    )}
                    {hasCredit && (
                        <div className="grid gap-1">
                            <p className="text-sm font-medium text-muted-foreground">Saldo</p>
                            <p className="font-semibold text-blue-600">Rp{(editableCustomer?.creditBalance ?? 0).toLocaleString('id-ID')}</p>
                        </div>
                    )}
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
          <CardDescription>Rincian transaksi pembayaran yang telah dilakukan oleh {customer.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal Bayar</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Total Tagihan</TableHead>
                <TableHead className="text-right">Diskon</TableHead>
                <TableHead className="text-right">Jumlah Dibayar</TableHead>
                <TableHead className="text-right">Kekurangan/Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerPayments.length > 0 ? customerPayments.map((payment) => {
                const effectiveBill = payment.totalBill - payment.discount;
                const difference = payment.paidAmount - effectiveBill;
                
                return (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{format(parseISO(payment.paymentDate), "d MMMM yyyy", { locale: id })}</TableCell>
                  <TableCell>{getMethodBadge(payment.paymentMethod)}</TableCell>
                  <TableCell className="text-right">Rp{payment.totalBill.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right text-green-600">Rp{payment.discount.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right font-semibold">Rp{payment.paidAmount.toLocaleString('id-ID')}</TableCell>
                   <TableCell className={`text-right font-semibold`}>
                    {difference < 0 ? (
                      <span className="text-destructive">
                        -Rp{Math.abs(difference).toLocaleString('id-ID')}
                      </span>
                    ) : difference > 0 ? (
                      <span className="text-blue-600">
                        +Rp{difference.toLocaleString('id-ID')}
                      </span>
                    ) : (
                      'Rp0'
                    )}
                  </TableCell>
                </TableRow>
              )}) : (
                <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                        Belum ada riwayat pembayaran.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Riwayat Faktur</CardTitle>
          <CardDescription>Rincian faktur bulanan untuk {customer.name}.</CardDescription>
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
              {(isEditing ? editableInvoices : customerInvoices).length > 0 ? (isEditing ? editableInvoices : customerInvoices).map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{format(parseISO(invoice.date), "MMMM yyyy", { locale: id })}</TableCell>
                  <TableCell className="text-right">Rp{invoice.amount.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-center">
                    {isEditing ? (
                        <Select
                            value={invoice.status}
                            onValueChange={(value: 'lunas' | 'belum lunas') => handleInvoiceStatusChange(invoice.id, value)}
                        >
                            <SelectTrigger className="w-[150px] mx-auto">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="lunas">Lunas</SelectItem>
                                <SelectItem value="belum lunas">Belum Lunas</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant="outline" className={getInvoiceBadgeClasses(invoice.status, invoice.dueDate)}>
                            {translateInvoiceStatus(invoice.status, invoice.dueDate)}
                        </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">
                        Tidak ada riwayat faktur.
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

    