
'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      
      <Tabs defaultValue="wajib" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wajib">Wajib</TabsTrigger>
          <TabsTrigger value="angsuran">Angsuran</TabsTrigger>
          <TabsTrigger value="lainnya">Lainnya</TabsTrigger>
        </TabsList>
        <TabsContent value="wajib">
          <Card>
            <CardHeader>
              <CardTitle>Pengeluaran Wajib</CardTitle>
              <CardDescription>
                Pengeluaran rutin bulanan seperti gaji atau sewa.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                 <p className="text-lg font-medium">Belum Ada Data</p>
                 <p className="text-muted-foreground">Mulai dengan menambahkan pengeluaran wajib.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="angsuran">
          <Card>
            <CardHeader>
              <CardTitle>Angsuran</CardTitle>
              <CardDescription>
                Cicilan atau pinjaman dengan tenor tertentu.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                 <p className="text-lg font-medium">Belum Ada Data</p>
                 <p className="text-muted-foreground">Mulai dengan menambahkan data angsuran.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="lainnya">
          <Card>
            <CardHeader>
              <CardTitle>Pengeluaran Lainnya</CardTitle>
              <CardDescription>
                Pengeluaran insidental atau tidak rutin.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                 <p className="text-lg font-medium">Belum Ada Data</p>
                 <p className="text-muted-foreground">Mulai dengan menambahkan pengeluaran lainnya.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
