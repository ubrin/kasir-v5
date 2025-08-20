
'use client';

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet } from "lucide-react";


export default function DelinquencyPage() {

  return (
    <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Tagihan Pelanggan</h1>
        </div>
        
        <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                <Wallet className="w-16 h-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Halaman Dalam Perbaikan</h2>
                <p className="text-muted-foreground max-w-md">
                    Halaman ini untuk sementara dinonaktifkan untuk meningkatkan performa dan stabilitas aplikasi.
                    Anda masih dapat mengelola pembayaran pelanggan melalui halaman "Data Pelanggan".
                </p>
            </CardContent>
        </Card>
    </div>
  )
}
