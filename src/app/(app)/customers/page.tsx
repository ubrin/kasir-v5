
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
import { MoreHorizontal } from "lucide-react"
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
import { AddCustomerDialog } from "@/components/add-customer-dialog";
import { useToast } from "@/hooks/use-toast";

export default function CustomersPage() {
  const [selectedGroup, setSelectedGroup] = React.useState<string>("all");
  const [forceUpdate, setForceUpdate] = React.useState(0);
  const router = useRouter();
  const { toast } = useToast();

  const handleCustomerAdded = (newCustomer: Omit<Customer, 'id' | 'status' | 'paymentHistory' | 'outstandingBalance'>) => {
    const newId = `cus_${Date.now()}`;
    const customerToAdd: Customer = {
      ...newCustomer,
      id: newId,
      status: newCustomer.amountDue > 0 ? 'belum lunas' : 'lunas',
      paymentHistory: 'Pelanggan baru.',
      outstandingBalance: newCustomer.amountDue,
      installationDate: newCustomer.installationDate,
    };
    customers.unshift(customerToAdd);
    
    toast({
        title: "Pelanggan Ditambahkan",
        description: `${newCustomer.name} telah berhasil ditambahkan ke daftar pelanggan.`,
    });

    setForceUpdate(prev => prev + 1);
  };

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
                                Tanggal {key}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <AddCustomerDialog onCustomerAdded={handleCustomerAdded} />
        </div>

        {filteredGroupKeys.length > 0 ? (
            filteredGroupKeys.map((code) => (
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
                            <TableHead className="hidden md:table-cell">Paket (Mbps)</TableHead>
                            <TableHead className="hidden md:table-cell">Alamat</TableHead>
                            <TableHead className="text-right">Harga</TableHead>
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
                                <TableCell className="hidden md:table-cell">{customer.subscriptionMbps}</TableCell>
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
            ))
        ) : (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-48 gap-2">
                    <p className="text-lg font-medium">Grup Tidak Ditemukan</p>
                    <p className="text-muted-foreground">Tidak ada pelanggan dalam grup yang dipilih.</p>
                </CardContent>
            </Card>
        )}
    </div>
  )
}
