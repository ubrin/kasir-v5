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
import { invoices } from "@/lib/data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const getBadgeVariant = (status: 'paid' | 'pending' | 'overdue') => {
  switch (status) {
    case 'paid':
      return 'secondary';
    case 'pending':
      return 'default';
    case 'overdue':
      return 'destructive';
  }
};

const getBadgeClasses = (status: 'paid' | 'pending' | 'overdue') => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
    }
  };

  const translateStatus = (status: 'paid' | 'pending' | 'overdue') => {
    switch (status) {
      case 'paid':
        return 'Lunas';
      case 'pending':
        return 'Tertunda';
      case 'overdue':
        return 'Jatuh Tempo';
    }
  };


export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Faktur</h1>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Faktur Baru
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Riwayat Faktur</CardTitle>
                <CardDescription>Daftar semua faktur yang dikirim ke pelanggan Anda.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>ID Faktur</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Tanggal</TableHead>
                    <TableHead className="hidden md:table-cell">Tanggal Jatuh Tempo</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>
                        <span className="sr-only">Aksi</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>
                            <Badge variant={getBadgeVariant(invoice.status)} className={getBadgeClasses(invoice.status)}>
                                {translateStatus(invoice.status)}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{invoice.date}</TableCell>
                        <TableCell className="hidden md:table-cell">{invoice.dueDate}</TableCell>
                        <TableCell className="text-right">${invoice.amount.toLocaleString()}</TableCell>
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
                            <DropdownMenuItem>Lihat Detail</DropdownMenuItem>
                            <DropdownMenuItem>Kirim Pengingat</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500">Batalkan Faktur</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  )
}
