
'use client';
import { customers } from "@/lib/data"
import { notFound, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const customer = customers.find((c) => c.id === params.id)

  if (!customer) {
    notFound()
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
            <div className="grid gap-1 col-span-full">
              <p className="text-sm font-medium text-muted-foreground">Riwayat Pembayaran</p>
              <p className="whitespace-pre-wrap">{customer.paymentHistory}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
