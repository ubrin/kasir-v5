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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Customer Overview</CardTitle>
                <CardDescription>A list of all customers in your system.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Company</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {customers.map((customer) => (
                    <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                                <Avatar className="hidden h-9 w-9 sm:flex">
                                    <AvatarImage src={customer.avatar} alt="Avatar" />
                                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="grid gap-0.5">
                                    <p className="font-semibold">{customer.name}</p>
                                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                        <Badge variant={customer.status === "active" ? "default" : "secondary"} className={customer.status === "active" ? "" : "bg-gray-200 text-gray-800"}>
                            {customer.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{customer.company}</TableCell>
                        <TableCell className="text-right">${customer.amountDue.toLocaleString()}</TableCell>
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
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>View Invoices</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
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
