
'use client';

import * as React from 'react';
import { format, startOfMonth, endOfMonth, parseISO, getMonth, getYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { collection, onSnapshot, query, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Payment, Collector, AppUser } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Receipt, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import withAuth from '@/components/withAuth';

type CollectorDailyCollection = {
    collectorId: string;
    collectorName: string;
    date: string;
    payments: Payment[];
    total: number;
    paymentMethodTotals: {
        cash: number;
        bri: number;
        dana: number;
    }
}

function PaymentReportPage() {
  const { toast } = useToast();
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [collectors, setCollectors] = React.useState<Collector[]>([]);
  const [selectedCollectorId, setSelectedCollectorId] = React.useState<string>('all');
  const [selectedMonth, setSelectedMonth] = React.useState<string>(String(getMonth(new Date())));
  const [selectedYear, setSelectedYear] = React.useState<string>(String(getYear(new Date())));

  const availableYears = React.useMemo(() => {
    if (payments.length === 0) return [String(getYear(new Date()))];
    const years = new Set(payments.map(p => getYear(parseISO(p.paymentDate)).toString()));
    return Array.from(years).sort((a,b) => parseInt(b) - parseInt(a));
  }, [payments]);

  const aditCollectorId = React.useMemo(() => {
      return collectors.find(c => c.name.toLowerCase() === 'adit')?.id || null;
  }, [collectors]);

  React.useEffect(() => {
    setLoading(true);

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        setAppUser(null);
        return;
      }

      try {
        const userDocQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
        
        const [userDoc, paymentsSnapshot, collectorsSnapshot] = await Promise.all([
            getDocs(userDocQuery),
            getDocs(query(collection(db, "payments"))),
            getDocs(query(collection(db, "collectors")))
        ]);

        let currentUser: AppUser | null = null;
        if (!userDoc.empty) {
          currentUser = userDoc.docs[0].data() as AppUser;
          setAppUser(currentUser);
        }

        const paymentsList = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
        setPayments(paymentsList);
        
        const collectorsList = collectorsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Collector))
            .sort((a, b) => a.name.localeCompare(b.name));
        setCollectors(collectorsList);

        const aditCollector = collectorsList.find(c => c.name.toLowerCase() === 'adit');
        if (currentUser?.role === 'user' && aditCollector) {
            setSelectedCollectorId(aditCollector.id);
        } else {
            setSelectedCollectorId('all');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Gagal Memuat Data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    });

    return () => authUnsubscribe();
  }, [toast]);

  const filteredPayments = React.useMemo(() => payments.filter(payment => {
    const paymentDate = parseISO(payment.paymentDate);
    const isMonthMatch = getMonth(paymentDate).toString() === selectedMonth;
    const isYearMatch = getYear(paymentDate).toString() === selectedYear;

    let isCollectorMatch = false;
    if (selectedCollectorId === 'all') {
        isCollectorMatch = true;
    } else if (selectedCollectorId === 'bayar-sendiri') {
        isCollectorMatch = !payment.collectorId;
    } else {
        isCollectorMatch = payment.collectorId === selectedCollectorId;
    }
    
    if (appUser?.role === 'user' && aditCollectorId) {
        return isMonthMatch && isYearMatch && payment.collectorId === aditCollectorId;
    }

    return isMonthMatch && isYearMatch && isCollectorMatch;
  }), [payments, selectedMonth, selectedYear, selectedCollectorId, appUser, aditCollectorId]);

  const groupedByCollectorAndDate = React.useMemo(() => filteredPayments.reduce((acc, payment) => {
    const collectorId = payment.collectorId || 'bayar-sendiri';
    const collector = collectors.find(c => c.id === collectorId);
    const collectorName = collector ? collector.name : 'Bayar Sendiri';

    const dateStr = payment.paymentDate.split(' ')[0];
    const key = `${collectorId}_${dateStr}`;

    if (!acc[key]) {
        acc[key] = {
            collectorId,
            collectorName,
            date: dateStr,
            payments: [],
            total: 0,
            paymentMethodTotals: { cash: 0, bri: 0, dana: 0 }
        };
    }
    
    acc[key].payments.push(payment);
    // FIX: Sum the paidAmount, not the totalPayment (bill amount)
    acc[key].total += payment.paidAmount;
    acc[key].paymentMethodTotals[payment.paymentMethod] += payment.paidAmount;

    return acc;
  }, {} as { [key: string]: CollectorDailyCollection }), [filteredPayments, collectors]);


  const sortedCollections = Object.values(groupedByCollectorAndDate).sort((a,b) => {
      const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.collectorName.localeCompare(b.collectorName);
  });
  
  const getMethodBadge = (method: 'cash' | 'bri' | 'dana') => {
    switch(method) {
        case 'cash': return <Badge variant="secondary">Cash</Badge>;
        case 'bri': return <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI</Badge>;
        case 'dana': return <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA</Badge>;
    }
  }

  const renderTabs = () => {
      if (appUser?.role === 'user') return null; // Don't show tabs for basic user

      const tabs = [];
      const adit = collectors.find(c => c.name.toLowerCase() === 'adit');
      if (adit) {
          tabs.push({ id: adit.id, name: adit.name });
      }

      tabs.push({ id: 'bayar-sendiri', name: 'Bayar Sendiri' });

      const otherCollectors = collectors
          .filter(c => c.name.toLowerCase() !== 'adit')
          .sort((a,b) => a.name.localeCompare(b.name));
      
      tabs.push(...otherCollectors);
      
      return (
          <div className="border-b">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                <TabsTrigger value="all" onClick={() => setSelectedCollectorId('all')}>Semua</TabsTrigger>
                {tabs.map(tab => (
                    <TabsTrigger key={tab.id} value={tab.id} onClick={() => setSelectedCollectorId(tab.id)}>
                        {tab.name}
                    </TabsTrigger>
                ))}
              </TabsList>
          </div>
      );
  }

  if (loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    );
  }

  const monthNames = Array.from({length: 12}, (e, i) => {
    return new Date(0, i).toLocaleString('id-ID', { month: 'long' })
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Laporan Pembayaran</h1>
            <p className="text-muted-foreground">Laporan penerimaan pembayaran dari pelanggan.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {appUser?.role === 'admin' && (
              <Select value={selectedCollectorId} onValueChange={setSelectedCollectorId}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Pilih Penagih" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Semua Penagih</SelectItem>
                      {collectors.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                      <SelectItem value="bayar-sendiri">Bayar Sendiri</SelectItem>
                  </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                        {monthNames.map((month, index) => (
                             <SelectItem key={index} value={String(index)}>{month}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                         {availableYears.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {sortedCollections.length > 0 ? (
        <Card>
            <CardHeader>
                <CardTitle>Rincian Setoran Penagih</CardTitle>
                <CardDescription>Klik pada tanggal untuk melihat rincian transaksi.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full space-y-4" defaultValue={sortedCollections.length > 0 ? [`${sortedCollections[0].collectorId}_${sortedCollections[0].date}`] : []}>
                    {sortedCollections.map((daily) => {
                        const key = `${daily.collectorId}_${daily.date}`;
                        return (
                             <AccordionItem value={key} key={key} className="border rounded-lg bg-card overflow-hidden">
                                <AccordionTrigger className="bg-muted/50 hover:no-underline px-4 sm:px-6 py-3">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
                                        <div className="text-left mb-2 sm:mb-0">
                                            <p className="font-semibold text-lg">{daily.collectorName}</p>
                                            <p className="text-sm text-muted-foreground">{format(parseISO(daily.date), 'eeee, d MMMM yyyy', { locale: id })}</p>
                                        </div>
                                        <div className="flex flex-col items-start sm:items-end gap-2">
                                            <span className="font-bold text-lg text-primary sm:mr-4">Total: Rp{daily.total.toLocaleString('id-ID')}</span>
                                            <div className="flex flex-wrap gap-2 sm:mr-4">
                                                <Badge variant="secondary">Cash: Rp{daily.paymentMethodTotals.cash.toLocaleString('id-ID')}</Badge>
                                                <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI: Rp{daily.paymentMethodTotals.bri.toLocaleString('id-ID')}</Badge>
                                                <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA: Rp{daily.paymentMethodTotals.dana.toLocaleString('id-ID')}</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                    <div className='md:hidden divide-y rounded-md border'>
                                        {daily.payments.map(payment => (
                                            <div key={payment.id} className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <Link href={`/customers/${payment.customerId}`} className="font-medium hover:underline">
                                                        {payment.customerName}
                                                    </Link>
                                                    {getMethodBadge(payment.paymentMethod)}
                                                </div>
                                                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                                    <p className="font-semibold">Rp{payment.paidAmount.toLocaleString('id-ID')}</p>
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/receipt/${payment.id}`}>
                                                            <Receipt className="mr-2 h-4 w-4" /> Struk
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="hidden md:block rounded-md border">
                                        <Table>
                                        <TableHeader>
                                            <TableRow>
                                            <TableHead>Pelanggan</TableHead>
                                            <TableHead>Metode Bayar</TableHead>
                                            <TableHead className="text-right">Jumlah Dibayar</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {daily.payments.map(payment => (
                                            <TableRow key={payment.id}>
                                                <TableCell className="font-medium">
                                                    <Link href={`/customers/${payment.customerId}`} className="hover:underline">
                                                        {payment.customerName}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{getMethodBadge(payment.paymentMethod)}</TableCell>
                                                <TableCell className="text-right">Rp{payment.paidAmount.toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/receipt/${payment.id}`}>
                                                            <Receipt className="mr-2 h-4 w-4" /> Lihat Struk
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            ))}
                                        </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            </CardContent>
        </Card>
      ) : (
        <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <p className="text-lg font-medium">Tidak Ada Data</p>
                <p className="text-muted-foreground">Tidak ada pembayaran yang tercatat pada periode yang dipilih.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

export default withAuth(PaymentReportPage);
