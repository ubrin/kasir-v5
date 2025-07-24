
'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, UserPlus, UsersRound } from "lucide-react";
import { collection, addDoc, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Collector, Payment } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";

function AddCollectorDialog({ onCollectorAdded }: { onCollectorAdded: () => void }) {
    const [open, setOpen] = React.useState(false);
    const [name, setName] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const { toast } = useToast();

    const handleAddCollector = async () => {
        if (!name.trim()) {
            toast({ title: "Nama tidak boleh kosong", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            await addDoc(collection(db, "collectors"), { name });
            toast({ title: "Penagih Ditambahkan", description: `${name} telah berhasil ditambahkan.` });
            onCollectorAdded(); // This is more for immediate feedback, onSnapshot will handle the rest
            setOpen(false);
            setName("");
        } catch (error) {
            console.error("Error adding collector:", error);
            toast({ title: "Gagal Menambahkan", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" /> Tambah Penagih
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tambah Penagih Baru</DialogTitle>
                    <DialogDescription>Masukkan nama penagih yang akan ditambahkan ke sistem.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="name">Nama Penagih</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Budi" disabled={loading} />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button>
                    <Button onClick={handleAddCollector} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const getMethodBadge = (method: 'cash' | 'bri' | 'dana') => {
    switch(method) {
        case 'cash': return <Badge variant="secondary">Cash</Badge>;
        case 'bri': return <Badge className="bg-blue-600 text-white hover:bg-blue-700">BRI</Badge>;
        case 'dana': return <Badge className="bg-sky-500 text-white hover:bg-sky-600">DANA</Badge>;
    }
}

type DailyCollection = {
    date: string;
    collectors: {
        [collectorId: string]: {
            name: string;
            payments: Payment[];
            total: number;
        }
    }
    total: number;
}

export default function CollectorsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [collectionsByDate, setCollectionsByDate] = React.useState<DailyCollection[]>([]);

    React.useEffect(() => {
        setLoading(true);
        const today = new Date();
        const start = format(startOfMonth(today), 'yyyy-MM-dd');
        const end = format(endOfMonth(today), 'yyyy-MM-dd');

        // Query for payments in the current month
        const paymentsQuery = query(
            collection(db, "payments"),
            where("paymentDate", ">=", start),
            where("paymentDate", "<=", end),
            orderBy("paymentDate", "desc")
        );
        
        // Listen to collectors and payments in real-time
        const unsubscribeCollectors = onSnapshot(collection(db, "collectors"), (collectorsSnapshot) => {
            const allCollectors = collectorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collector));
            const collectorsMap = new Map(allCollectors.map(c => [c.id, c.name]));
            collectorsMap.set('unassigned', 'Tidak Ditentukan');

            const unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
                const monthlyPayments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));

                const groupedByDate: { [date: string]: DailyCollection } = {};

                for (const payment of monthlyPayments) {
                    const dateStr = payment.paymentDate;
                    if (!groupedByDate[dateStr]) {
                        groupedByDate[dateStr] = { date: dateStr, collectors: {}, total: 0 };
                    }

                    const collectorId = payment.collectorId || 'unassigned';
                    const collectorName = collectorsMap.get(collectorId) || 'Nama Tidak Ditemukan';

                    if (!groupedByDate[dateStr].collectors[collectorId]) {
                        groupedByDate[dateStr].collectors[collectorId] = {
                            name: collectorName,
                            payments: [],
                            total: 0
                        };
                    }
                    
                    groupedByDate[dateStr].collectors[collectorId].payments.push(payment);
                    groupedByDate[dateStr].collectors[collectorId].total += payment.totalPayment;
                    groupedByDate[dateStr].total += payment.totalPayment;
                }
                
                const sortedCollections = Object.values(groupedByDate).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setCollectionsByDate(sortedCollections);
                setLoading(false);
            }, (error) => {
                 console.error("Error fetching payments data:", error);
                 toast({ title: "Gagal memuat data pembayaran", variant: "destructive" });
                 setLoading(false);
            });

            // Return the payment listener unsub function to be called when collector listener reruns
            return () => unsubscribePayments();

        }, (error) => {
            console.error("Error fetching collectors data:", error);
            toast({ title: "Gagal memuat data penagih", variant: "destructive" });
            setLoading(false);
        });

        // Clean up main collector listener on component unmount
        return () => {
            unsubscribeCollectors();
        };

    }, [toast]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Penagih</h1>
          <p className="text-muted-foreground">Laporan setoran dari penagih di lapangan per bulan ini.</p>
        </div>
        <AddCollectorDialog onCollectorAdded={() => {}} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
      ) : collectionsByDate.length > 0 ? (
        <Card>
            <CardHeader>
                <CardTitle>Setoran Bulan Ini</CardTitle>
                <CardDescription>Rincian setoran harian dari semua penagih.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full space-y-4" defaultValue={collectionsByDate.length > 0 ? [collectionsByDate[0].date] : []}>
                    {collectionsByDate.map((daily) => (
                        <AccordionItem value={daily.date} key={daily.date} className="border rounded-lg bg-card overflow-hidden">
                             <AccordionTrigger className="bg-muted/50 hover:no-underline px-4 sm:px-6 py-3">
                                <div className="flex justify-between items-center w-full">
                                    <span className="font-semibold text-lg">{format(parseISO(daily.date), 'eeee, d MMMM yyyy', { locale: localeId })}</span>
                                    <span className="font-bold text-lg text-primary mr-4">Total: Rp{daily.total.toLocaleString('id-ID')}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                                {Object.values(daily.collectors)
                                    .sort((a,b) => a.name.localeCompare(b.name))
                                    .map(collectorData => (
                                    <div key={collectorData.name} className="border-t">
                                        <div className="bg-muted/30 px-4 sm:px-6 py-2 flex justify-between items-center">
                                            <h3 className="font-semibold">{collectorData.name}</h3>
                                            <p className="text-sm font-medium">Subtotal: Rp{collectorData.total.toLocaleString('id-ID')}</p>
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Pelanggan</TableHead>
                                                    <TableHead>Metode</TableHead>
                                                    <TableHead className="text-right">Jumlah</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {collectorData.payments.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{p.customerName}</TableCell>
                                                        <TableCell>{getMethodBadge(p.paymentMethod)}</TableCell>
                                                        <TableCell className="text-right">Rp{p.totalPayment.toLocaleString('id-ID')}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
      ) : (
        <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                <UsersRound className="w-16 h-16 text-muted-foreground" />
                <p className="text-lg font-medium">Belum Ada Setoran</p>
                <p className="text-muted-foreground">Tidak ada data pembayaran yang tercatat dari penagih bulan ini.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
