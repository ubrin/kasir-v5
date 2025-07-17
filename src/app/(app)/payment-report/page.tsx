
'use client';

import * as React from 'react';
import { addDays, format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { payments } from '@/lib/data';
import type { Payment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"


type GroupedPayments = {
  [date: string]: {
    cash: number;
    bri: number;
    dana: number;
    total: number;
    details: Payment[];
  };
};

export default function PaymentReportPage() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const filteredPayments = payments.filter(payment => {
    if (!date?.from) return true;
    const paymentDate = new Date(payment.paymentDate);
    const fromDate = new Date(date.from.setHours(0, 0, 0, 0));
    const toDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : new Date(date.from.setHours(23, 59, 59, 999));
    return paymentDate >= fromDate && paymentDate <= toDate;
  });

  const groupedPayments = filteredPayments.reduce<GroupedPayments>((acc, payment) => {
    const paymentDate = format(parseISO(payment.paymentDate.toISOString()), 'yyyy-MM-dd');
    if (!acc[paymentDate]) {
      acc[paymentDate] = { cash: 0, bri: 0, dana: 0, total: 0, details: [] };
    }
    acc[paymentDate][payment.paymentMethod] += payment.paidAmount;
    acc[paymentDate].total += payment.paidAmount;
    acc[paymentDate].details.push(payment);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedPayments).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const grandTotal = sortedDates.reduce(
    (acc, date) => {
      acc.cash += groupedPayments[date].cash;
      acc.bri += groupedPayments[date].bri;
      acc.dana += groupedPayments[date].dana;
      acc.total += groupedPayments[date].total;
      return acc;
    },
    { cash: 0, bri: 0, dana: 0, total: 0 }
  );
  
  const getMethodBadge = (method: 'cash' | 'bri' | 'dana') => {
    switch(method) {
        case 'cash': return <Badge variant="secondary">Cash</Badge>;
        case 'bri': return <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI</Badge>;
        case 'dana': return <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA</Badge>;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Laporan Pembayaran</h1>
            <p className="text-muted-foreground">Laporan penerimaan pembayaran dari pelanggan.</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={'outline'}
              className={cn('w-[300px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'LLL dd, y', {locale: id})} - {format(date.to, 'LLL dd, y', {locale: id})}
                  </>
                ) : (
                  format(date.from, 'LLL dd, y', {locale: id})
                )
              ) : (
                <span>Pilih tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              locale={id}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Ringkasan Laporan</CardTitle>
            <CardDescription>Total penerimaan berdasarkan metode pembayaran pada periode yang dipilih.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Metode Pembayaran</TableHead>
                        <TableHead className="text-right">Total Penerimaan</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-medium">Cash</TableCell>
                        <TableCell className="text-right">Rp{grandTotal.cash.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">BRI</TableCell>
                        <TableCell className="text-right">Rp{grandTotal.bri.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-medium">DANA</TableCell>
                        <TableCell className="text-right">Rp{grandTotal.dana.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                </TableBody>
                <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL KESELURUHAN</TableCell>
                    <TableCell className="text-right">Rp{grandTotal.total.toLocaleString('id-ID')}</TableCell>
                </TableRow>
            </Table>
        </CardContent>
      </Card>
      
      {sortedDates.length > 0 ? (
        <Card>
            <CardHeader>
                <CardTitle>Rincian Harian</CardTitle>
                <CardDescription>Klik pada tanggal untuk melihat rincian transaksi.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full">
                    {sortedDates.map(dateStr => {
                        const dateData = groupedPayments[dateStr];
                        return (
                             <AccordionItem value={dateStr} key={dateStr}>
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex justify-between w-full items-center pr-4">
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold text-base">{format(parseISO(dateStr), 'eeee, d MMMM yyyy', { locale: id })}</span>
                                            <div className="flex gap-4 text-sm text-muted-foreground pt-1">
                                                <span>Cash: <span className="font-medium text-foreground">Rp{dateData.cash.toLocaleString('id-ID')}</span></span>
                                                <span>BRI: <span className="font-medium text-foreground">Rp{dateData.bri.toLocaleString('id-ID')}</span></span>
                                                <span>DANA: <span className="font-medium text-foreground">Rp{dateData.dana.toLocaleString('id-ID')}</span></span>
                                            </div>
                                        </div>
                                        <span className="font-bold text-lg text-primary">Total: Rp{dateData.total.toLocaleString('id-ID')}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>Pelanggan</TableHead>
                                        <TableHead>Metode Bayar</TableHead>
                                        <TableHead className="text-right">Jumlah Dibayar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dateData.details.map(payment => (
                                        <TableRow key={payment.id}>
                                            <TableCell className="font-medium">{payment.customerName}</TableCell>
                                            <TableCell>{getMethodBadge(payment.paymentMethod)}</TableCell>
                                            <TableCell className="text-right">Rp{payment.paidAmount.toLocaleString('id-ID')}</TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
        </Card>
      ) : (
        <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 gap-2">
                <p className="text-lg font-medium">Tidak Ada Data</p>
                <p className="text-muted-foreground">Tidak ada pembayaran yang tercatat pada periode tanggal yang dipilih.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
