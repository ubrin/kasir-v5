
'use client';
import { customers, invoices } from "@/lib/data"
import { notFound, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const customer = customers.find((c) => c.id === params.id)
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === params.id);

  if (!customer) {
    notFound()
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
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
          <CardDescription>ID Pelanggan: {customer.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={customer.amountDue > 0 ? "destructive" : "secondary"} className={`${customer.amountDue > 0 ? "" : "bg-green-100 text-green-800"} w-fit`}>
                {customer.amountDue > 0 ? "Belum Lunas" : "Lunas"}
              </Badge>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Alamat</p>
              <p>{customer.address}</p>
            </div>
             <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Tanggal Jatuh Tempo</p>
              <p>Setiap tanggal {customer.dueDateCode}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Jumlah Tagihan</p>
              <p>Rp{customer.amountDue.toLocaleString('id-ID')}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Total Tunggakan</p>
              <p>Rp{customer.outstandingBalance.toLocaleString('id-ID')}</p>
            </div>
             <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Usia Akun</p>
              <p>{customer.accountAgeMonths} bulan</p>
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">Langganan (Mbps)</p>
              <p>{customer.subscriptionMbps} Mbps</p>
            </div>
            <div className="grid gap-1 col-span-full">
              <p className="text-sm font-medium text-muted-foreground">Catatan</p>
              <p className="whitespace-pre-wrap">{customer.paymentHistory}</p>
            </div>
          </div>
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
                  <TableCell className="font-medium">{format(new Date(invoice.date), "MMMM yyyy", { locale: id })}</TableCell>
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
