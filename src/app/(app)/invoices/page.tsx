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

export default function InvoicesPage() {
  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> New Invoice
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>A list of all invoices sent to your customers.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell">Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
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
                                {invoice.status}
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
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500">Void Invoice</DropdownMenuItem>
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
