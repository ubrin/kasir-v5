
'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, PlusCircle } from "lucide-react"
import { customers } from "@/lib/data"
import type { Customer } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"

export default function CustomersPage() {
  const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
  const router = useRouter();

  const groupedCustomers = customers.reduce((acc, customer) => {
    const code = customer.dueDateCode;
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(customer);
    return acc;
  }, {} as Record<number, Customer[]>);

  const groupKeys = Object.keys(groupedCustomers).map(Number).sort((a, b) => a - b);
  
  const filteredGroupKeys = selectedGroup === "all" 
    ? groupKeys 
    : groupKeys.filter(key => key.toString() === selectedGroup);

  const handleRowClick = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };


  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Pelanggan</h1>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Pilih grup" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Grup</SelectItem>
                        {groupKeys.map(key => (
                            <SelectItem key={key} value={key.toString()}>
                                Grup Tanggal {key}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pelanggan
            </Button>
        </div>

        {filteredGroupKeys.map((code) => (
            <Card key={code}>
                <CardHeader>
                    <CardTitle>Tanggal {code}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Alamat</TableHead>
                        <TableHead className="text-right">Jumlah Tagihan</TableHead>
                        <TableHead>
                            <span className="sr-only">Aksi</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedCustomers[code].map((customer) => (
                        <TableRow 
                            key={customer.id} 
                            onClick={() => handleRowClick(customer.id)}
                            className="cursor-pointer"
                        >
                            <TableCell className="font-semibold">
                                {customer.name}
                            </TableCell>
                            <TableCell>
                            <Badge variant={customer.amountDue > 0 ? "destructive" : "secondary"} className={customer.amountDue > 0 ? "" : "bg-green-100 text-green-800"}>
                                {customer.amountDue > 0 ? "Belum Lunas" : "Lunas"}
                            </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{customer.address}</TableCell>
                            <TableCell className="text-right">Rp{customer.amountDue.toLocaleString('id-ID')}</TableCell>
                            <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button 
                                    aria-haspopup="true" 
                                    size="icon" 
                                    variant="ghost"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Buka menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                <DropdownMenuItem>Ubah</DropdownMenuItem>
                                <DropdownMenuItem>Lihat Faktur</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500">Hapus</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        ))}
    </div>
  )
}
