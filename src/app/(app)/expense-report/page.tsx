
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expense, ExpenseCategory, MainExpenseItem, InstallmentItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, PlusCircle, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { v4 as uuidv4 } from 'uuid';


const categoryTitles: Record<ExpenseCategory, string> = {
    main: "Pengeluaran Utama",
    installments: "Angsuran",
    other: "Pengeluaran Lainnya"
};

const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';
    return Number(value).toLocaleString('id-ID');
};

const parseFormattedNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    return Number(String(value).replace(/\./g, ''));
};


// --- Helper function to calculate total expense ---
const calculateTotal = (exp: Expense) => {
    const main = (exp.mainExpenses || []).reduce((sum, i) => sum + i.amount, 0);
    const inst = (exp.installments || []).reduce((sum, i) => sum + i.amount, 0);
    const other = exp.otherExpenses?.amount || 0;
    return main + inst + other;
}


// --- Form Components ---

const MainExpenseManager = ({ expense, onSave, onNavigateBack, periodLabel }: { expense: Expense, onSave: (data: any) => Promise<void>, onNavigateBack: () => void, periodLabel: string }) => {
    const [mainExpenses, setMainExpenses] = React.useState<MainExpenseItem[]>(expense.mainExpenses || []);
    const { toast } = useToast();

    React.useEffect(() => {
        setMainExpenses(expense.mainExpenses || []);
    }, [expense.mainExpenses]);

    const handleSaveChanges = async (updatedMainExpenses: MainExpenseItem[]) => {
        const updatedExpense = { ...expense, mainExpenses: updatedMainExpenses };
        const totalExpense = calculateTotal(updatedExpense);
        await onSave({ mainExpenses: updatedMainExpenses, totalExpense });
        setMainExpenses(updatedMainExpenses);
        toast({ title: "Perubahan Disimpan", description: "Data pengeluaran utama telah diperbarui." });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Kelola Pengeluaran Utama</CardTitle>
                <CardDescription>{periodLabel}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Pengeluaran</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mainExpenses.length > 0 ? mainExpenses.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">Rp{formatNumber(item.amount)}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <EditMainExpenseDialog 
                                        expenseItem={item} 
                                        onSave={(updated) => {
                                            const newItems = mainExpenses.map(i => i.id === updated.id ? updated : i);
                                            handleSaveChanges(newItems);
                                        }}
                                    />
                                    <DeleteDialog
                                        onConfirm={() => {
                                            const newItems = mainExpenses.filter(i => i.id !== item.id);
                                            handleSaveChanges(newItems);
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">Belum ada data pengeluaran utama.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onNavigateBack}>Kembali</Button>
                <AddMainExpenseDialog 
                    onSave={(newItem) => {
                        const newItems = [...mainExpenses, newItem];
                        handleSaveChanges(newItems);
                    }}
                />
            </CardFooter>
        </Card>
    );
};


const OtherExpenseForm = ({ expense, onSave, onNavigateBack, periodLabel }: { expense: Expense, onSave: (data: any) => Promise<void>, onNavigateBack: () => void, periodLabel: string }) => {
    const [otherExpenses, setOtherExpenses] = React.useState(expense.otherExpenses || { amount: '' as any, note: '' });
    const [loading, setLoading] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        setOtherExpenses(expense.otherExpenses || { amount: '' as any, note: '' });
    }, [expense.otherExpenses]);

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const numericValue = parseFormattedNumber(value);
        setOtherExpenses(prev => ({ ...prev, amount: numericValue }));
    };

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setOtherExpenses(prev => ({...prev, note: e.target.value}));
    };
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const updatedExpense = { ...expense, otherExpenses };
        const totalExpense = calculateTotal(updatedExpense);
        await onSave({ otherExpenses, totalExpense });
        setLoading(false);
        toast({ title: "Perubahan Disimpan", description: "Data pengeluaran lainnya telah diperbarui." });
    }

    return (
        <Card>
            <form onSubmit={handleFormSubmit}>
                <CardHeader>
                    <CardTitle>Kelola Pengeluaran Lainnya</CardTitle>
                    <CardDescription>{periodLabel}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Jumlah (Rp)</Label>
                        <Input id="amount" type="text" placeholder="cth. 150.000" value={formatNumber(otherExpenses.amount)} onChange={handleCurrencyChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="note">Keterangan</Label>
                        <Textarea id="note" placeholder="cth. Biaya tak terduga, perbaikan alat, dll." value={otherExpenses.note} onChange={handleNoteChange} />
                    </div>
                </CardContent>
                <CardFooter className="justify-between">
                    <Button variant="outline" onClick={onNavigateBack}>Kembali</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Simpan Perubahan
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

const InstallmentManager = ({ expense, onSave, onNavigateBack, periodLabel }: { expense: Expense, onSave: (data: any) => Promise<void>, onNavigateBack: () => void, periodLabel: string }) => {
    const [installments, setInstallments] = React.useState<InstallmentItem[]>(expense.installments || []);
    const { toast } = useToast();

    React.useEffect(() => {
        setInstallments(expense.installments || []);
    }, [expense.installments]);

    const handleSaveChanges = async (updatedInstallments: InstallmentItem[]) => {
        const updatedExpense = { ...expense, installments: updatedInstallments };
        const totalExpense = calculateTotal(updatedExpense);
        await onSave({ installments: updatedInstallments, totalExpense });
        setInstallments(updatedInstallments);
        toast({ title: "Perubahan Disimpan", description: "Data angsuran telah diperbarui." });
    };

    const handlePayInstallment = async (installmentId: string) => {
        const updatedInstallments = installments.map(item => {
            if (item.id === installmentId && item.currentTenor > 0) {
                return { ...item, currentTenor: item.currentTenor - 1 };
            }
            return item;
        });

        const updatedExpense = { ...expense, installments: updatedInstallments };
        const totalExpense = calculateTotal(updatedExpense);
        
        await onSave({ installments: updatedInstallments, totalExpense });
        setInstallments(updatedInstallments);
        toast({ title: "Pembayaran Berhasil", description: "Tenor angsuran telah berkurang." });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Kelola Angsuran</CardTitle>
                <CardDescription>{periodLabel}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Angsuran</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead>Tenor</TableHead>
                            <TableHead>Jatuh Tempo</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {installments.length > 0 ? installments.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>Rp{formatNumber(item.amount)}</TableCell>
                                <TableCell>{item.currentTenor > 0 ? `${item.currentTenor} / ${item.totalTenor} bulan` : 'Lunas'}</TableCell>
                                <TableCell>Tgl {item.dueDate}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button size="sm" onClick={() => handlePayInstallment(item.id)} disabled={item.currentTenor === 0}>
                                        Bayar
                                    </Button>
                                    <EditInstallmentDialog 
                                        installment={item} 
                                        onSave={(updated) => {
                                            const newInstallments = installments.map(i => i.id === updated.id ? updated : i);
                                            handleSaveChanges(newInstallments);
                                        }}
                                    />
                                    <DeleteDialog
                                        onConfirm={() => {
                                            const newInstallments = installments.filter(i => i.id !== item.id);
                                            handleSaveChanges(newInstallments);
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">Belum ada data angsuran.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onNavigateBack}>Kembali</Button>
                <AddInstallmentDialog 
                    onSave={(newItem) => {
                        const newInstallments = [...installments, newItem];
                        handleSaveChanges(newInstallments);
                    }}
                />
            </CardFooter>
        </Card>
    );
};


// --- Dialog Components ---

const AddMainExpenseDialog = ({ onSave }: { onSave: (item: MainExpenseItem) => void }) => {
    const [open, setOpen] = React.useState(false);
    const [item, setItem] = React.useState<Omit<MainExpenseItem, 'id'>>({ name: '', amount: '' as any });

    const handleSave = () => {
        if (!item.name || !item.amount) return;
        onSave({ ...item, amount: parseFormattedNumber(item.amount), id: uuidv4() });
        setOpen(false);
        setItem({ name: '', amount: '' as any });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah Pengeluaran</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Pengeluaran Utama Baru</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama Pengeluaran</Label>
                        <Input id="name" value={item.name} onChange={(e) => setItem(p => ({ ...p, name: e.target.value }))} placeholder="cth. Gaji Karyawan" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="amount">Jumlah (Rp)</Label>
                        <Input id="amount" type="text" value={formatNumber(item.amount)} onChange={(e) => setItem(p => ({ ...p, amount: parseFormattedNumber(e.target.value) }))} placeholder="cth. 3.000.000" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={handleSave}>Simpan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const EditMainExpenseDialog = ({ expenseItem, onSave }: { expenseItem: MainExpenseItem, onSave: (item: MainExpenseItem) => void }) => {
    const [open, setOpen] = React.useState(false);
    const [item, setItem] = React.useState<MainExpenseItem>(expenseItem);

    React.useEffect(() => {
        setItem(expenseItem);
    }, [expenseItem]);

    const handleSave = () => {
        if (!item.name || !item.amount) return;
        onSave({ ...item, amount: parseFormattedNumber(item.amount) });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Ubah</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah Data Pengeluaran</DialogTitle>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama Pengeluaran</Label>
                        <Input id="name" value={item.name} onChange={(e) => setItem(p => ({ ...p, name: e.target.value }))} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="amount">Jumlah (Rp)</Label>
                        <Input id="amount" type="text" value={formatNumber(item.amount)} onChange={(e) => setItem(p => ({ ...p, amount: parseFormattedNumber(e.target.value) }))} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={handleSave}>Simpan Perubahan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const AddInstallmentDialog = ({ onSave }: { onSave: (item: InstallmentItem) => void }) => {
    const [open, setOpen] = React.useState(false);
    const [item, setItem] = React.useState<Omit<InstallmentItem, 'id'>>({
        name: '', amount: '' as any, totalTenor: '' as any, currentTenor: '' as any, dueDate: '' as any
    });

    const handleSave = () => {
        if (!item.name || !item.amount || !item.totalTenor || !item.dueDate) return;
        onSave({ 
            ...item, 
            id: uuidv4(),
            amount: parseFormattedNumber(item.amount),
            totalTenor: Number(item.totalTenor),
            currentTenor: Number(item.totalTenor), // Current tenor starts same as total
            dueDate: Number(item.dueDate)
        });
        setOpen(false);
        setItem({ name: '', amount: '' as any, totalTenor: '' as any, currentTenor: '' as any, dueDate: '' as any });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah Angsuran</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Angsuran Baru</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama Angsuran</Label>
                        <Input id="name" value={item.name} onChange={(e) => setItem(p => ({ ...p, name: e.target.value }))} placeholder="cth. Cicilan Mobil" />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="amount">Jumlah (Rp)</Label>
                        <Input id="amount" type="text" value={formatNumber(item.amount)} onChange={(e) => setItem(p => ({ ...p, amount: parseFormattedNumber(e.target.value) }))} placeholder="cth. 2.500.000"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="totalTenor">Total Tenor (Bulan)</Label>
                            <Input id="totalTenor" type="number" value={item.totalTenor} onChange={(e) => setItem(p => ({ ...p, totalTenor: Number(e.target.value) }))} placeholder="cth. 12" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Tgl Jatuh Tempo</Label>
                            <Input id="dueDate" type="number" value={item.dueDate} onChange={(e) => setItem(p => ({ ...p, dueDate: Number(e.target.value) }))} placeholder="cth. 15" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={handleSave}>Simpan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const EditInstallmentDialog = ({ installment, onSave }: { installment: InstallmentItem, onSave: (item: InstallmentItem) => void }) => {
    const [open, setOpen] = React.useState(false);
    const [item, setItem] = React.useState<InstallmentItem>(installment);

    React.useEffect(() => {
        setItem(installment);
    }, [installment]);

    const handleSave = () => {
        if (!item.name || !item.amount || !item.totalTenor || !item.dueDate) return;
        onSave({ ...item, amount: parseFormattedNumber(item.amount) });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">Ubah</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Ubah Data Angsuran</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nama Angsuran</Label>
                        <Input id="name" value={item.name} onChange={(e) => setItem(p => ({ ...p, name: e.target.value }))} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="amount">Jumlah (Rp)</Label>
                        <Input id="amount" type="text" value={formatNumber(item.amount)} onChange={(e) => setItem(p => ({ ...p, amount: parseFormattedNumber(e.target.value) }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="currentTenor">Tenor Berjalan</Label>
                            <Input id="currentTenor" type="number" value={item.currentTenor} onChange={(e) => setItem(p => ({ ...p, currentTenor: Number(e.target.value) }))} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="totalTenor">Total Tenor</Label>
                            <Input id="totalTenor" type="number" value={item.totalTenor} onChange={(e) => setItem(p => ({ ...p, totalTenor: Number(e.target.value) }))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Tgl Tempo</Label>
                            <Input id="dueDate" type="number" value={item.dueDate} onChange={(e) => setItem(p => ({ ...p, dueDate: Number(e.target.value) }))} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={handleSave}>Simpan Perubahan</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const DeleteDialog = ({ onConfirm }: { onConfirm: () => void }) => {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Hapus</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                    <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Ya, Hapus</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};



// --- Main Page Component ---

export default function ExpenseReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [loading, setLoading] = React.useState(true);
    const [expense, setExpense] = React.useState<Expense | null>(null);

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category') as ExpenseCategory | null;
    
    const fetchExpenseData = React.useCallback(async () => {
        if (!from || !category) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const expensesQuery = query(collection(db, "expenses"), where("periodFrom", "==", from));
            const expensesSnapshot = await getDocs(expensesQuery);
            
            if (!expensesSnapshot.empty) {
                const expenseData = { id: expensesSnapshot.docs[0].id, ...expensesSnapshot.docs[0].data() } as Expense;
                // Ensure arrays exist
                if (!expenseData.installments) expenseData.installments = [];
                if (!expenseData.mainExpenses) expenseData.mainExpenses = [];
                if (!expenseData.otherExpenses) expenseData.otherExpenses = { amount: 0, note: '' };
                setExpense(expenseData);
            } else {
                 const newExpense: Expense = {
                    id: '', // Will be set on save
                    periodFrom: from,
                    periodTo: to || from,
                    mainExpenses: [],
                    installments: [],
                    otherExpenses: { amount: 0, note: '' },
                    totalExpense: 0,
                    createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                };
                setExpense(newExpense);
            }
        } catch (error) {
            console.error("Error fetching expense data:", error);
            toast({
                title: "Gagal memuat data",
                description: "Tidak dapat mengambil data pengeluaran.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [from, to, category, toast]);

    React.useEffect(() => {
        fetchExpenseData();
    }, [fetchExpenseData]);
    
    const handleSave = async (dataToUpdate: Partial<Expense>) => {
        if (!expense || !from || !to) return;
    
        const payload: any = {
            ...expense,
            ...dataToUpdate,
            periodFrom: from,
            periodTo: to,
            updatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        };
    
        // Remove id and createdAt for update operations to avoid overwriting them
        const { id: expenseId, createdAt, ...updatePayload } = payload;
    
        try {
            if (expense.id) {
                const expenseDocRef = doc(db, "expenses", expense.id);
                await updateDoc(expenseDocRef, updatePayload);
            } else {
                const newDocRef = await addDoc(collection(db, "expenses"), { ...updatePayload, createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss') });
                // Update local state with the new ID so subsequent saves are updates
                setExpense(prev => prev ? ({ ...prev, id: newDocRef.id }) : null);
            }
            // No full refresh to avoid losing focus, local state is managed by components
            // await fetchExpenseData(); 
        } catch (error) {
            console.error("Error saving expense:", error);
            toast({ title: "Gagal Menyimpan", description: `Terjadi kesalahan: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
        }
    };

    const renderCategoryDetails = () => {
        if (!expense || !category) {
            return (
                <Card>
                    <CardContent className="h-24 text-center flex items-center justify-center">
                        Tidak ada data pengeluaran untuk kategori ini pada periode yang dipilih.
                    </CardContent>
                </Card>
            );
        }

        const periodLabel = from && to 
            ? `${format(parseISO(from), 'd MMM yyyy', { locale: localeId })} - ${format(parseISO(to), 'd MMM yyyy', { locale: localeId })}`
            : "Periode tidak valid";
        
        const commonProps = {
            expense: expense,
            onSave: handleSave,
            onNavigateBack: () => router.back(),
            periodLabel
        };

        switch (category) {
            case 'main':
                return <MainExpenseManager {...commonProps} />;
            case 'installments':
                return <InstallmentManager {...commonProps} />;
            case 'other':
                return <OtherExpenseForm {...commonProps} />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        );
    }
    
    const title = category ? categoryTitles[category] : "Laporan Pengeluaran";

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Kembali</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                </div>
            </div>
            {renderCategoryDetails()}
        </div>
    );
}

    