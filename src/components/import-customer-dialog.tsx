
'use client';

import * as React from 'react';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { writeBatch, collection, addDoc } from 'firebase/firestore';
import { format, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2 } from 'lucide-react';
import type { Customer, Invoice } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface ImportCustomerDialogProps {
  onSuccess: () => void;
}

// Define the expected CSV headers
const EXPECTED_HEADERS = [
  "name",
  "address",
  "phone",
  "installationDate",
  "subscriptionMbps",
  "dueDateCode",
  "packagePrice",
];

export function ImportCustomerDialog({ onSuccess }: ImportCustomerDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setParsedData([]);
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            const headers = results.meta.fields || [];
            const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));

            if (missingHeaders.length > 0) {
                 setError(`File CSV tidak valid. Header berikut tidak ditemukan: ${missingHeaders.join(', ')}`);
                 setParsedData([]);
                 return;
            }

            // Filter out rows where essential fields are missing
            const validData = results.data.filter((row: any) => row.name && row.address && row.packagePrice);
            setParsedData(validData as any[]);
        },
        error: (err: any) => {
          setError(`Gagal mem-parsing file: ${err.message}`);
        },
      });
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      setError('Tidak ada data valid untuk diimpor.');
      return;
    }
    setLoading(true);

    try {
      const batch = writeBatch(db);

      parsedData.forEach((row) => {
        const packagePrice = Number(row.packagePrice) || 0;
        
        // Validate and format date
        let installationDateStr = format(new Date(), 'yyyy-MM-dd');
        try {
            // Attempt to parse with common formats, default to today
            const parsedDate = parse(row.installationDate, 'dd/MM/yyyy', new Date());
            if (!isNaN(parsedDate.getTime())) {
                installationDateStr = format(parsedDate, 'yyyy-MM-dd');
            }
        } catch (e) { /* Defaults to today */ }

        const newCustomer: Omit<Customer, 'id'> = {
          name: row.name || 'N/A',
          address: row.address || 'N/A',
          phone: row.phone || '',
          installationDate: installationDateStr,
          subscriptionMbps: Number(row.subscriptionMbps) || 0,
          dueDateCode: Number(row.dueDateCode) || 1,
          packagePrice: packagePrice,
          outstandingBalance: packagePrice,
          paymentHistory: `Diimpor pada ${format(new Date(), 'dd/MM/yyyy')}`
        };
        const customerRef = doc(collection(db, 'customers'));
        batch.set(customerRef, newCustomer);

        if (packagePrice > 0) {
          const today = new Date();
          const dueDate = new Date(today.getFullYear(), today.getMonth(), newCustomer.dueDateCode);
           if (dueDate < today) {
                dueDate.setMonth(dueDate.getMonth() + 1);
            }
          const newInvoice: Omit<Invoice, 'id'> = {
            customerId: customerRef.id,
            customerName: newCustomer.name,
            date: format(today, 'yyyy-MM-dd'),
            dueDate: format(dueDate, 'yyyy-MM-dd'),
            amount: packagePrice,
            status: 'belum lunas',
          };
          const invoiceRef = doc(collection(db, 'invoices'));
          batch.set(invoiceRef, newInvoice);
        }
      });

      await batch.commit();
      onSuccess();
      setOpen(false);
      setFile(null);
      setParsedData([]);
    } catch (e) {
      console.error('Error importing customers:', e);
      toast({
        title: 'Impor Gagal',
        description: 'Terjadi kesalahan saat menyimpan data ke database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
            <FileUp className="mr-2 h-4 w-4" /> Impor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Impor Pelanggan dari CSV</DialogTitle>
          <DialogDescription>
            Pilih file CSV untuk mengimpor data pelanggan secara massal. Pastikan file Anda memiliki header: name, address, phone, installationDate (dd/MM/yyyy), subscriptionMbps, dueDateCode, packagePrice.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {parsedData.length > 0 && (
          <>
            <p className="text-sm font-medium">Pratinjau Data ({parsedData.length} baris ditemukan):</p>
            <ScrollArea className="h-64 w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead className="text-right">Harga Paket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.address}</TableCell>
                      <TableCell className="text-right">Rp{Number(row.packagePrice || 0).toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedData.length > 10 && <p className="text-center text-sm text-muted-foreground p-2">Dan {parsedData.length - 10} baris lainnya...</p>}
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || parsedData.length === 0 || loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Mulai Impor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
