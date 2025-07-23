'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { PlusCircle } from "lucide-react";

export default function CollectorsPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daftar Penagih</h1>
          <p className="text-muted-foreground">Kelola data penagih di lapangan.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Tambah Penagih
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Penagih Terdaftar</CardTitle>
          <CardDescription>Berikut adalah daftar semua penagih yang terdaftar di sistem.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={1} className="text-center h-48 text-muted-foreground">
                            Belum ada data penagih. <br /> Klik "Tambah Penagih" untuk memulai.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
