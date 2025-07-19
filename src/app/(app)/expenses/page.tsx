
'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function ExpensesPage() {

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Pengeluaran</h1>
            <p className="text-muted-foreground">Catat dan kelola semua pengeluaran Anda.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengeluaran
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengeluaran</CardTitle>
          <CardDescription>
            Rincian pengeluaran Anda akan ditampilkan di sini.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
             <p className="text-lg font-medium">Belum Ada Data</p>
             <p className="text-muted-foreground">Mulai dengan menambahkan pengeluaran baru.</p>
        </CardContent>
      </Card>
    </div>
  );
}
