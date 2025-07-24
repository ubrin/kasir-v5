
'use client';

import * as React from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { OtherIncome } from "@/lib/types";
import { format, parseISO, isSameMonth, isSameYear, parse } from 'date-fns';
import { id } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, Trash2, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AddOtherIncomeDialog } from "@/components/add-other-income-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function OtherIncomesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<{ thisMonth: OtherIncome[], byMonth: Record<string, OtherIncome[]> }>({
    thisMonth: [],
    byMonth: {}
  });
  const [incomeToDelete, setIncomeToDelete] = React.useState<OtherIncome | null>(null);

  const fetchIncomes = React.useCallback(async () => {
    setLoading(true);
    try {
      const incomesQuery = query(collection(db, "otherIncomes"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(incomesQuery);
      const allIncomes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OtherIncome));

      const today = new Date();
      const thisMonthIncomes = allIncomes.filter(inc => {
          const incomeDate = parseISO(inc.date!);
          return isSameMonth(incomeDate, today) && isSameYear(incomeDate, today);
      });

      const groupedByMonth = allIncomes.reduce((acc, income) => {
        const monthYear = format(parseISO(income.date!), 'MMMM yyyy', { locale: id });
        if (!acc[monthYear]) {
          acc[monthYear] = [];
        }
        acc[monthYear].push(income);
        return acc;
      }, {} as Record<string, OtherIncome[]>);

      setHistory({
        thisMonth: thisMonthIncomes,
        byMonth: groupedByMonth
      });

    } catch (error) {
      console.error("Error fetching incomes:", error);
      toast({
        title: "Gagal Memuat Data",
        description: "Tidak dapat mengambil data pemasukan.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const handleIncomeAdded = async (newIncomeData: { name: string, amount: number }) => {
     try {
        await addDoc(collection(db, "otherIncomes"), {
            name: newIncomeData.name,
            amount: newIncomeData.amount,
            date: format(new Date(), 'yyyy-MM-dd'),
        });
        
        toast({
            title: "Pemasukan Dicatat",
            description: `${newIncomeData.name} telah berhasil dicatat.`,
        });
        fetchIncomes();
    } catch (error) {
        console.error("Error adding income:", error);
        toast({
            title: "Gagal Mencatat Pemasukan",
            variant: "destructive",
        });
    }
  };

  const handleDeleteClick = (item: OtherIncome) => {
    setIncomeToDelete(item);
  };

  const confirmDelete = async () => {
    if (!incomeToDelete) return;
    try {
        await deleteDoc(doc(db, "otherIncomes", incomeToDelete.id));
        toast({
            title: "Riwayat Dihapus",
            description: `Riwayat pemasukan untuk ${incomeToDelete.name} telah berhasil dihapus.`,
            variant: "destructive"
        });
        setIncomeToDelete(null);
        fetchIncomes();
    } catch (error) {
        console.error("Error deleting income item:", error);
        toast({
            title: "Gagal Menghapus Riwayat",
            variant: "destructive"
        });
    }
  };

  const renderHistoryTable = (data: OtherIncome[]) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <p className="text-lg font-medium">Tidak Ada Riwayat</p>
          <p className="text-muted-foreground">Belum ada pemasukan yang tercatat.</p>
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead className="text-right">Jumlah</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.date ? format(parseISO(item.date), 'd MMMM yyyy', { locale: id }) : ''}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-right">Rp{(item.amount || 0).toLocaleString('id-ID')}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Buka menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderGroupedHistory = (data: Record<string, OtherIncome[]>) => {
    const sortedMonths = Object.keys(data).sort((a, b) => {
        const dateA = parse(a, 'MMMM yyyy', new Date(), { locale: id });
        const dateB = parse(b, 'MMMM yyyy', new Date(), { locale: id });
        return dateB.getTime() - dateA.getTime();
    });

    if (sortedMonths.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <p className="text-lg font-medium">Tidak Ada Riwayat</p>
                <p className="text-muted-foreground">Belum ada pemasukan lain yang tercatat.</p>
            </div>
        );
    }

    return (
        <Accordion type="multiple" className="w-full" defaultValue={sortedMonths.length > 0 ? [sortedMonths[0]] : []}>
            {sortedMonths.map(month => {
                const incomesForMonth = data[month];
                const totalForMonth = incomesForMonth.reduce((sum, inc) => sum + (inc.amount || 0), 0);
                return (
                    <AccordionItem value={month} key={month}>
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4">
                                <span>{month}</span>
                                <span className="font-semibold">Total: Rp{totalForMonth.toLocaleString('id-ID')}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                            {renderHistoryTable(incomesForMonth)}
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pemasukan Lainnya</h1>
            <p className="text-muted-foreground">Catat dan kelola pemasukan di luar tagihan pelanggan.</p>
          </div>
          <AddOtherIncomeDialog onConfirm={handleIncomeAdded} />
        </div>
        
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Riwayat Bulan Ini</CardTitle>
                    <CardDescription>Pemasukan lain yang tercatat bulan ini.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderHistoryTable(history.thisMonth)}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Semua Riwayat Pemasukan Lainnya</CardTitle>
                    <CardDescription>Seluruh pemasukan lain yang pernah tercatat, dikelompokkan per bulan.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderGroupedHistory(history.byMonth)}
                </CardContent>
            </Card>
        </div>
      </div>

      <AlertDialog open={!!incomeToDelete} onOpenChange={(isOpen) => !isOpen && setIncomeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin ingin menghapus riwayat ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus riwayat pemasukan untuk <span className="font-bold">{incomeToDelete?.name}</span>. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIncomeToDelete(null)}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
