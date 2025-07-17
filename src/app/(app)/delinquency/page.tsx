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
  customerId: z.string().min(1, 'Customer ID is required.'),
  paymentHistory: z.string().min(10, 'Payment history is required.'),
  accountAgeMonths: z.coerce.number().min(1, 'Account age must be at least 1 month.'),
  averageMonthlyBill: z.coerce.number().min(0, 'Average monthly bill cannot be negative.'),
  outstandingBalance: z.coerce.number().min(0, 'Outstanding balance cannot be negative.'),
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
      console.error("Prediction failed:", error);
      toast({
        variant: "destructive",
        title: "Prediction Failed",
        description: "An error occurred while trying to predict delinquency.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Delinquency Prediction</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Predict Risk</CardTitle>
            <CardDescription>Use AI to predict the risk of a customer becoming delinquent.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <Label>Select Customer (Optional)</Label>
                    <Select onValueChange={handleCustomerSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Load data from a customer..." />
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
                        <FormLabel>Customer ID</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="paymentHistory" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Payment History</FormLabel>
                        <FormControl><Textarea {...field} rows={4} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                
                <FormField control={form.control} name="accountAgeMonths" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Account Age (Months)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="averageMonthlyBill" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Average Monthly Bill ($)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <FormField control={form.control} name="outstandingBalance" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Outstanding Balance ($)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Predicting...' : 'Predict Delinquency Risk'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
            <Card className="sticky top-24">
                <CardHeader>
                    <CardTitle>AI Analysis</CardTitle>
                    <CardDescription>The prediction result will appear here.</CardDescription>
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
                                {prediction.isDelinquentRisk ? 'High Delinquency Risk' : 'Low Delinquency Risk'}
                            </h3>
                            <div>
                                <Label>Risk Score: {prediction.riskScore}</Label>
                                <Progress value={prediction.riskScore} className={prediction.riskScore > 60 ? "[&>div]:bg-destructive" : ""} />
                            </div>
                            <Card className="text-left bg-muted/50">
                                <CardHeader className="flex-row gap-3 items-center space-y-0">
                                    <Bot className="w-6 h-6 text-primary flex-shrink-0"/>
                                    <CardTitle className="text-lg">Reasoning</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{prediction.reason}</p>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <p>Fill out the form and click predict to see the AI analysis.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
