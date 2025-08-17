
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Total Keuangan</h1>
            <p className="text-muted-foreground">Halaman ini untuk menampilkan laporan keuangan yang lebih detail.</p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Dalam Pengembangan</CardTitle>
                <CardDescription>Fitur laporan lengkap sedang dalam tahap pengembangan.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Silakan kembali lagi nanti untuk melihat laporan keuangan yang lebih komprehensif.</p>
            </CardContent>
        </Card>
    </div>
  );
}
