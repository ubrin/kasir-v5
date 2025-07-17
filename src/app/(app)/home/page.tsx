
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, BarChart3, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Selamat Datang!</h1>
        <p className="text-muted-foreground">
          Pilih menu di bawah untuk mulai mengelola bisnis Anda.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/delinquency">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-md">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Tagihan</CardTitle>
                <CardDescription>Lihat dan kelola semua tagihan pelanggan.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/payment-report">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-md">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Laporan</CardTitle>
                <CardDescription>Tinjau laporan pembayaran dan pemasukan.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/customers">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="bg-primary text-primary-foreground p-3 rounded-md">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Data Pelanggan</CardTitle>
                <CardDescription>Akses dan kelola informasi semua pelanggan.</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
