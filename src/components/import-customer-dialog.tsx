
'use client';

import * as React from 'react';
import Papa from 'papaparse';
import { db } from '@/lib/firebase';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { format, parse, differenceInCalendarMonths, addMonths, startOfMonth, parseISO, getDate, getYear, getMonth, differenceInDays } from 'date-fns';
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
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ImportCustomerDialogProps {
  onSuccess: () => void;
}

// Map user's headers to our internal customer fields
const headerMapping: { [key: string]: keyof Omit<Customer, 'id' | 'outstandingBalance' | 'paymentHistory'> } = {
    nama: 'name',
    alamat: 'address',
    kode: 'dueDateCode',
    paket: 'subscriptionMbps',
    harga: 'packagePrice',
    phone: 'phone',
    installationDate: 'installationDate'
};


export function ImportCustomerDialog({ onSuccess }: ImportCustomerDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const [detectedHeaders, setDetectedHeaders] = React.useState<string[]>([]);

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
            const headers = (results.meta.fields || []).map(h => h.trim().toLowerCase());
            setDetectedHeaders(headers);

            const requiredUserHeaders = ['nama', 'alamat', 'harga'];
            const missingHeaders = requiredUserHeaders.filter(h => !headers.includes(h));

            if (missingHeaders.length > 0) {
                 setError(`File CSV tidak valid. Header wajib berikut tidak ditemukan: ${missingHeaders.join(', ')}`);
                 setParsedData([]);
                 return;
            }

            // Filter out rows where essential fields are missing
            const validData = results.data.filter((row: any) => row.nama && row.alamat && row.harga);
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
        const lowerCaseRow: { [key: string]: any } = {};
        for (const key in row) {
            lowerCaseRow[key.trim().toLowerCase()] = row[key];
        }

        const packagePrice = Number(lowerCaseRow.harga) || 0;
        const dueDateCode = Number(lowerCaseRow.kode) || 1;
        
        let installationDate = new Date();
        if (lowerCaseRow.installationdate) {
            try {
                // Handle different date formats, default to dd/MM/yyyy
                const parsedDate = parse(lowerCaseRow.installationdate, 'dd/MM/yyyy', new Date());
                if (!isNaN(parsedDate.getTime())) {
                    installationDate = parsedDate;
                } else {
                    const parsedDateISO = parseISO(lowerCaseRow.installationdate);
                     if (!isNaN(parsedDateISO.getTime())) {
                        installationDate = parsedDateISO;
                    }
                }
            } catch (e) { /* Defaults to today */ }
        }
        const installationDateStr = format(installationDate, 'yyyy-MM-dd');
        
        const today = new Date();
        const startOfInstallationMonth = startOfMonth(installationDate);
        const startOfCurrentMonth = startOfMonth(today);

        const installationDay = getDate(installationDate);
        let firstDueDate;
        if (installationDay < dueDateCode) {
            firstDueDate = new Date(getYear(installationDate), getMonth(installationDate), dueDateCode);
        } else {
            firstDueDate = addMonths(new Date(getYear(installationDate), getMonth(installationDate), dueDateCode), 1);
        }
        
        const daysToFirstDueDate = differenceInDays(firstDueDate, installationDate);
        
        let invoiceStartDate = startOfInstallationMonth;
        if (daysToFirstDueDate <= 25) {
            invoiceStartDate = addMonths(startOfInstallationMonth, 1);
        }

        let totalInvoices = 0;
        if (invoiceStartDate <= startOfCurrentMonth) {
            totalInvoices = differenceInCalendarMonths(startOfCurrentMonth, invoiceStartDate) + 1;
        }

        const totalOutstanding = totalInvoices * packagePrice;

        const newCustomer: Omit<Customer, 'id'> = {
          name: lowerCaseRow.nama || 'N/A',
          address: lowerCaseRow.alamat || 'N/A',
          phone: lowerCaseRow.phone || '',
          installationDate: installationDateStr,
          subscriptionMbps: Number(lowerCaseRow.paket) || 0,
          dueDateCode: dueDateCode,
          packagePrice: packagePrice,
          outstandingBalance: totalOutstanding,
          paymentHistory: `Diimpor pada ${format(new Date(), 'dd/MM/yyyy')}`
        };
        const customerRef = doc(collection(db, 'customers'));
        batch.set(customerRef, newCustomer);

        if (packagePrice > 0 && totalInvoices > 0) {
            for (let i = 0; i < totalInvoices; i++) {
                const invoiceMonthDate = addMonths(invoiceStartDate, i);
                const invoiceDueDate = new Date(invoiceMonthDate.getFullYear(), invoiceMonthDate.getMonth(), newCustomer.dueDateCode);
                
                const newInvoice: Omit<Invoice, 'id'> = {
                    customerId: customerRef.id,
                    customerName: newCustomer.name,
                    date: format(invoiceMonthDate, 'yyyy-MM-dd'),
                    dueDate: format(invoiceDueDate, 'yyyy-MM-dd'),
                    amount: packagePrice,
                    status: 'belum lunas',
                };
                const invoiceRef = doc(collection(db, 'invoices'));
                batch.set(invoiceRef, newInvoice);
            }
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
            Pilih file CSV. Header wajib: <strong>nama, alamat, harga</strong>. Header opsional: <strong>kode, paket, phone, installationDate</strong> (format dd/MM/yyyy).
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>File Contoh</AlertTitle>
          <AlertDescription>
              Saya telah menyiapkan file `public/customers-to-import.csv` yang bisa langsung Anda gunakan untuk mengimpor data contoh.
          </AlertDescription>
        </Alert>
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
                    {detectedHeaders.map(h => headerMapping[h] && <TableHead key={h}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {detectedHeaders.map(h => headerMapping[h] && (
                        <TableCell key={`${index}-${h}`}>
                           { h === 'harga' ? `Rp${Number(row[h] || 0).toLocaleString('id-ID')}` : row[h] }
                        </TableCell>
                      ))}
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
