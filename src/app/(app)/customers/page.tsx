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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CustomersPage() {
  const groupedCustomers = customers.reduce((acc, customer) => {
    const code = customer.dueDateCode;
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(customer);
    return acc;
  }, {} as Record<number, Customer[]>);

  const sortedGroupKeys = Object.keys(groupedCustomers).map(Number).sort((a, b) => a - b);


  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Pelanggan</h1>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Pelanggan
            </Button>
        </div>

        {sortedGroupKeys.map((code) => (
            <Card key={code}>
                <CardHeader>
                    <CardTitle>Grup Jatuh Tempo: Tanggal {code}</CardTitle>
                    <CardDescription>Daftar pelanggan dengan tanggal jatuh tempo setiap tanggal {code}.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Tgl. Jatuh Tempo</TableHead>
                        <TableHead className="hidden md:table-cell">Alamat</TableHead>
                        <TableHead className="text-right">Jumlah Tagihan</TableHead>
                        <TableHead>
                            <span className="sr-only">Aksi</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {groupedCustomers[code].map((customer) => (
                        <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.dueDateCode}</TableCell>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                    <Avatar className="hidden h-9 w-9 sm:flex">
                                        <AvatarImage src={customer.avatar} alt="Avatar" />
                                        <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-0.5">
                                        <p className="font-semibold">{customer.name}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                            <Badge variant={customer.amountDue > 0 ? "destructive" : "secondary"} className={customer.amountDue > 0 ? "" : "bg-green-100 text-green-800"}>
                                {customer.amountDue > 0 ? "Belum Lunas" : "Lunas"}
                            </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">Setiap tgl. {customer.dueDateCode}</TableCell>
                            <TableCell className="hidden md:table-cell">{customer.address}</TableCell>
                            <TableCell className="text-right">Rp{customer.amountDue.toLocaleString('id-ID')}</TableCell>
                            <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Buka menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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