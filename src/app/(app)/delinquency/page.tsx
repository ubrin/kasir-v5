'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { delinquencyPrediction, DelinquencyPredictionInput, DelinquencyPredictionOutput } from '@/ai/flows/delinquency-prediction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { customers } from '@/lib/data';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Bot, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  customerId: z.string().min(1, 'ID Pelanggan wajib diisi.'),
  paymentHistory: z.string().min(10, 'Riwayat pembayaran wajib diisi.'),
  accountAgeMonths: z.coerce.number().min(1, 'Usia akun minimal 1 bulan.'),
  averageMonthlyBill: z.coerce.number().min(0, 'Rata-rata tagihan bulanan tidak boleh negatif.'),
  outstandingBalance: z.coerce.number().min(0, 'Saldo terutang tidak boleh negatif.'),
});

type DelinquencyFormValues = z.infer<typeof formSchema>;

export default function DelinquencyPage() {
  const [prediction, setPrediction] = useState<DelinquencyPredictionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<DelinquencyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      paymentHistory: '',
      accountAgeMonths: 0,
      averageMonthlyBill: 0,
      outstandingBalance: 0,
    },
  });

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      form.reset({
        customerId: customer.id,
        paymentHistory: customer.paymentHistory,
        accountAgeMonths: customer.accountAgeMonths,
        averageMonthlyBill: customer.averageMonthlyBill,
        outstandingBalance: customer.outstandingBalance,
      });
      setPrediction(null);
    }
  };

  const onSubmit = async (data: DelinquencyFormValues) => {
    setIsLoading(true);
    setPrediction(null);
    try {
      const result = await delinquencyPrediction(data);
      setPrediction(result);
    } catch (error) {
      console.error("Prediksi gagal:", error);
      toast({
        variant: "destructive",
        title: "Prediksi Gagal",
        description: "Terjadi kesalahan saat mencoba memprediksi tunggakan.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Prediksi Tunggakan</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Prediksi Risiko</CardTitle>
            <CardDescription>Gunakan AI untuk memprediksi risiko pelanggan menunggak.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label>Pilih Pelanggan (Opsional)</Label>
                    <Select onValueChange={handleCustomerSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Muat data dari pelanggan..." />
                        </SelectTrigger>
                        <SelectContent>
                            {customers.map(customer => (
                                <SelectItem key={customer.id} value={customer.id}>
                                    {customer.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <FormField control={form.control} name="customerId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>ID Pelanggan</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="paymentHistory" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Riwayat Pembayaran</FormLabel>
                        <FormControl><Textarea {...field} rows={4} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                
                <FormField control={form.control} name="accountAgeMonths" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Usia Akun (Bulan)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="averageMonthlyBill" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Rata-rata Tagihan Bulanan ($)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="outstandingBalance" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Saldo Terutang ($)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Memprediksi...' : 'Prediksi Risiko Tunggakan'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
            <Card className="sticky top-24">
                <CardHeader>
                    <CardTitle>Analisis AI</CardTitle>
                    <CardDescription>Hasil prediksi akan muncul di sini.</CardDescription>
                </CardHeader>
                <CardContent className="min-h-[400px] flex items-center justify-center">
                    {isLoading ? (
                        <div className="w-full space-y-4">
                            <Skeleton className="h-8 w-1/2 mx-auto" />
                            <Skeleton className="h-12 w-1/4 mx-auto" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    ) : prediction ? (
                        <div className="w-full space-y-4 text-center">
                            {prediction.isDelinquentRisk ? (
                                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                            ) : (
                                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                            )}
                            <h3 className={`text-2xl font-bold ${prediction.isDelinquentRisk ? 'text-destructive' : 'text-green-600'}`}>
                                {prediction.isDelinquentRisk ? 'Risiko Tunggakan Tinggi' : 'Risiko Tunggakan Rendah'}
                            </h3>
                            <div>
                                <Label>Skor Risiko: {prediction.riskScore}</Label>
                                <Progress value={prediction.riskScore} className={prediction.riskScore > 60 ? "[&>div]:bg-destructive" : ""} />
                            </div>
                            <Card className="text-left bg-muted/50">
                                <CardHeader className="flex-row gap-3 items-center space-y-0">
                                    <Bot className="w-6 h-6 text-primary flex-shrink-0"/>
                                    <CardTitle className="text-lg">Alasan</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{prediction.reason}</p>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <p>Isi formulir dan klik prediksi untuk melihat analisis AI.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
