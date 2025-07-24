
'use client';

import * as React from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { format, parse, differenceInCalendarMonths, addMonths, startOfMonth, parseISO, getDate } from 'date-fns';
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
const headerMapping: { [key: string]: keyof Omit<Customer, 'id' | 'outstandingBalance' | 'paymentHistory' | 'creditBalance'> } = {
    nama: 'name',
    alamat: 'address',
    kode: 'dueDateCode',
    paket: 'subscriptionMbps',
    harga: 'packagePrice',
    phone: 'phone',
    installationdate: 'installationDate'
};


export function ImportCustomerDialog({ onSuccess }: ImportCustomerDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const [detectedHeaders, setDetectedHeaders] = React.useState<string[]>([]);

  const processData = (data: any[], headers: string[]) => {
    setDetectedHeaders(headers);

    const requiredUserHeaders = ['nama', 'alamat', 'harga'];
    const missingHeaders = requiredUserHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
        setError(`File tidak valid. Header wajib berikut tidak ditemukan: ${missingHeaders.join(', ')}`);
        setParsedData([]);
        return;
    }

    // Filter out rows where essential fields are missing
    const validData = data.filter((row: any) => {
        const lowerCaseRow: { [key: string]: any } = {};
        for (const key in row) {
            lowerCaseRow[key.trim().toLowerCase()] = row[key];
        }
        return lowerCaseRow.nama && lowerCaseRow.alamat && lowerCaseRow.harga;
    });
    setParsedData(validData);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        setError(null);
        setParsedData([]);

        const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

        if (fileExtension === 'csv') {
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const headers = (results.meta.fields || []).map(h => h.trim().toLowerCase());
                    processData(results.data as any[], headers);
                },
                error: (err: any) => {
                    setError(`Gagal mem-parsing file CSV: ${err.message}`);
                },
            });
        } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                if(data) {
                    try {
                        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                        
                        if (jsonData.length > 0) {
                            const headers: string[] = (jsonData[0] as string[]).map(h => String(h).trim().toLowerCase());
                            const dataRows = XLSX.utils.sheet_to_json(sheet);
                            processData(dataRows as any[], headers);
                        } else {
                            setError('File Excel kosong atau tidak memiliki header.');
                        }
                    } catch (err) {
                        setError(`Gagal mem-parsing file Excel. Pastikan formatnya benar.`);
                    }
                }
            };
            reader.onerror = () => {
                 setError('Gagal membaca file.');
            }
            reader.readAsBinaryString(selectedFile);
        } else {
            setError('Format file tidak didukung. Harap gunakan file .csv, .xls, atau .xlsx');
        }
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
        const instDateValue = lowerCaseRow.installationdate;

        if (instDateValue) {
            let parsedDate: Date | null = null;
            if (instDateValue instanceof Date && !isNaN(instDateValue.getTime())) {
                parsedDate = instDateValue;
            } else if (typeof instDateValue === 'string') {
                const formatsToTry = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'd/M/yy'];
                for (const fmt of formatsToTry) {
                    const d = parse(instDateValue, fmt, new Date());
                    if (!isNaN(d.getTime())) {
                        parsedDate = d;
                        break;
                    }
                }
                if (!parsedDate) parsedDate = parseISO(instDateValue);
            }
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                installationDate = parsedDate;
            }
        }
        
        const installationDateStr = format(installationDate, 'yyyy-MM-dd');
        
        const today = new Date();
        const startOfCurrentMonth = startOfMonth(today);

        // --- REVISED LOGIC ---
        const dueDateInInstallationMonth = new Date(installationDate.getFullYear(), installationDate.getMonth(), dueDateCode);
        
        let firstInvoiceMonth = startOfMonth(installationDate);
        if (installationDate > dueDateInInstallationMonth) {
          firstInvoiceMonth = addMonths(firstInvoiceMonth, 1);
        }
        // --- END REVISED LOGIC ---
        
        let totalInvoices = 0;
        // Ensure we don't create invoices for future months and the first invoice month is not in the future
        if (firstInvoiceMonth <= startOfCurrentMonth) {
            totalInvoices = differenceInCalendarMonths(startOfCurrentMonth, firstInvoiceMonth) + 1;
        }

        const totalOutstanding = totalInvoices * packagePrice;

        const newCustomer: Omit<Customer, 'id' | 'paymentHistory' | 'creditBalance'> = {
          name: lowerCaseRow.nama || 'N/A',
          address: lowerCaseRow.alamat || 'N/A',
          phone: String(lowerCaseRow.phone || ''),
          installationDate: installationDateStr,
          subscriptionMbps: Number(lowerCaseRow.paket) || 0,
          dueDateCode: dueDateCode,
          packagePrice: packagePrice,
          outstandingBalance: totalOutstanding,
        };
        const customerRef = doc(collection(db, 'customers'));
        batch.set(customerRef, {
            ...newCustomer,
            paymentHistory: `Diimpor pada ${format(new Date(), 'dd/MM/yyyy')}`,
            creditBalance: 0
        });

        if (packagePrice > 0 && totalInvoices > 0) {
            for (let i = 0; i < totalInvoices; i++) {
                const invoiceMonthDate = addMonths(firstInvoiceMonth, i);
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
          <DialogTitle>Impor Pelanggan dari CSV/Excel</DialogTitle>
          <DialogDescription>
            Pilih file .csv, .xls, atau .xlsx. Header wajib: <strong>nama, alamat, harga</strong>. Header opsional: <strong>kode, paket, phone, installationdate</strong> (format dd/MM/yyyy).
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>File Contoh</AlertTitle>
          <AlertDescription>
              Saya telah menyiapkan file `public/customers-to-import.csv` yang bisa langsung Anda gunakan untuk mengimpor data contoh.
          </AlertDescription>
        </Alert>
        <div className="grid gap-4 py-4">
          <Input id="csvFile" type="file" accept=".csv, .xls, .xlsx" onChange={handleFileChange} />
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
                      {detectedHeaders.map(h => {
                         const lowerCaseHeader = h.trim().toLowerCase();
                         if (headerMapping[lowerCaseHeader]) {
                            const value = row[h] || row[Object.keys(row).find(k => k.trim().toLowerCase() === lowerCaseHeader)!];
                            let displayValue = value instanceof Date ? format(value, 'dd/MM/yyyy') : value;
                             if (lowerCaseHeader === 'harga') {
                                displayValue = `Rp${Number(value || 0).toLocaleString('id-ID')}`;
                            }
                            return <TableCell key={`${index}-${h}`}>{String(displayValue ?? '')}</TableCell>
                         }
                         return null;
                      })}
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
            disabled={!file || parsedData.length === 0 || !!error || loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Mulai Impor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
