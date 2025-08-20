
'use client';

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, UserPlus, UsersRound, Trash2 } from "lucide-react";
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { Collector, Payment } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
            onCollectorAdded(); 
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

type CollectorMonthlyTotal = {
    id: string;
    name: string;
    total: number;
}

export default function CollectorsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [allCollectors, setAllCollectors] = React.useState<Collector[]>([]);
    const [monthlyTotals, setMonthlyTotals] = React.useState<CollectorMonthlyTotal[]>([]);
    const [collectorToDelete, setCollectorToDelete] = React.useState<Collector | null>(null);

    const fetchCollectorData = React.useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date();
            const start = format(startOfMonth(today), 'yyyy-MM-dd');
            const end = format(endOfMonth(today), 'yyyy-MM-dd');

            const collectorsQuery = query(collection(db, "collectors"));
            const paymentsQuery = query(
                collection(db, "payments"),
                where("paymentDate", ">=", start),
                where("paymentDate", "<=", end),
            );

            const [collectorsSnapshot, paymentsSnapshot] = await Promise.all([
                getDocs(collectorsQuery),
                getDocs(paymentsQuery)
            ]);

            const collectorsList = collectorsSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Collector))
                .sort((a, b) => a.name.localeCompare(b.name));
            setAllCollectors(collectorsList);

            const collectorsMap = new Map(collectorsList.map(c => [c.id, c.name]));
            collectorsMap.set('unassigned', 'Tidak Ditentukan');

            const monthlyPayments = paymentsSnapshot.docs.map(doc => doc.data() as Payment);
            
            const totals: { [id: string]: CollectorMonthlyTotal } = {};

            // Initialize totals for all collectors to ensure they appear even with 0 collection
            collectorsMap.forEach((name, id) => {
                totals[id] = { id, name, total: 0 };
            });

            for (const payment of monthlyPayments) {
                const collectorId = payment.collectorId || 'unassigned';
                const collectorName = collectorsMap.get(collectorId) || 'Nama Tidak Ditemukan';

                if (!totals[collectorId]) {
                     totals[collectorId] = { id: collectorId, name: collectorName, total: 0 };
                }
                totals[collectorId].total += payment.totalPayment;
            }
            
            const sortedTotals = Object.values(totals).sort((a,b) => a.name.localeCompare(b.name));
            setMonthlyTotals(sortedTotals);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ title: "Gagal memuat data", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        fetchCollectorData();
    }, [fetchCollectorData]);

    const handleDeleteCollector = async () => {
        if (!collectorToDelete) return;
        try {
            // First, check if there are payments associated with this collector
            const paymentsQuery = query(collection(db, "payments"), where("collectorId", "==", collectorToDelete.id));
            const paymentsSnapshot = await getDocs(paymentsQuery);

            if (!paymentsSnapshot.empty) {
                toast({
                    title: "Tidak Dapat Menghapus",
                    description: `Tidak dapat menghapus ${collectorToDelete.name} karena masih ada riwayat pembayaran yang terkait.`,
                    variant: "destructive"
                });
                setCollectorToDelete(null);
                return;
            }

            await deleteDoc(doc(db, "collectors", collectorToDelete.id));
            toast({
                title: "Penagih Dihapus",
                description: `${collectorToDelete.name} telah berhasil dihapus.`,
                variant: "destructive"
            });
            setCollectorToDelete(null);
            fetchCollectorData(); // Refetch data
        } catch (error) {
            console.error("Error deleting collector:", error);
            toast({
                title: "Gagal Menghapus",
                variant: "destructive"
            });
        }
    };


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Penagih</h1>
          <p className="text-muted-foreground">Kelola penagih dan lihat laporan setoran per bulan ini.</p>
        </div>
        <AddCollectorDialog onCollectorAdded={fetchCollectorData} />
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Semua Penagih Terdaftar</CardTitle>
                <CardDescription>Daftar semua penagih yang ada di sistem.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : allCollectors.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Penagih</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allCollectors.map((collector) => (
                                <TableRow key={collector.id}>
                                    <TableCell className="font-medium">{collector.name}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setCollectorToDelete(collector)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center py-8">Belum ada penagih yang ditambahkan.</p>
                )}
            </CardContent>
        </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
      ) : monthlyTotals.length > 0 ? (
        <Card>
            <CardHeader>
                <CardTitle>Setoran Bulan Ini</CardTitle>
                <CardDescription>Ringkasan total setoran dari semua penagih pada bulan ini.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Penagih</TableHead>
                            <TableHead className="text-right">Total Setoran Bulan Ini</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {monthlyTotals.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right font-semibold">Rp{item.total.toLocaleString('id-ID')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      ) : (
        <Card>
             <CardHeader>
                <CardTitle>Setoran Bulan Ini</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-48 gap-4 text-center">
                <UsersRound className="w-16 h-16 text-muted-foreground" />
                <p className="text-lg font-medium">Belum Ada Setoran</p>
                <p className="text-muted-foreground">Tidak ada data pembayaran yang tercatat dari penagih bulan ini.</p>
            </CardContent>
        </Card>
      )}

        <AlertDialog open={!!collectorToDelete} onOpenChange={(isOpen) => !isOpen && setCollectorToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin ingin menghapus penagih ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini akan menghapus <span className="font-bold">{collectorToDelete?.name}</span> secara permanen. Tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCollectorToDelete(null)}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteCollector}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        Ya, Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}

    