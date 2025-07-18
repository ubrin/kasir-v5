
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function MonthlyBookkeepingPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pembukuan Bulanan</h1>
        <p className="text-muted-foreground">
          Ringkasan pendapatan dan pengeluaran bulanan Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dalam Pengembangan</CardTitle>
          <CardDescription>
            Fitur pembukuan bulanan sedang dalam tahap pengembangan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Halaman ini akan menampilkan laporan keuangan bulanan secara rinci untuk membantu Anda memantau kesehatan bisnis. Nantikan pembaruan selanjutnya!</p>
        </CardContent>
      </Card>
    </div>
  );
}
