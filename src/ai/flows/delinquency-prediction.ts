'use server';

/**
 * @fileOverview This file defines a Genkit flow for predicting customer delinquency.
 *
 * - delinquencyPrediction - A function that predicts the likelihood of a customer defaulting on payments.
 * - DelinquencyPredictionInput - The input type for the delinquencyPrediction function.
 * - DelinquencyPredictionOutput - The return type for the delinquencyPrediction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DelinquencyPredictionInputSchema = z.object({
  customerId: z.string().describe('Pengidentifikasi unik untuk pelanggan.'),
  paymentHistory: z.string().describe('Riwayat pembayaran pelanggan, termasuk tanggal dan jumlah.'),
  accountAgeMonths: z.number().describe('Usia akun pelanggan dalam bulan.'),
  averageMonthlyBill: z.number().describe('Jumlah tagihan bulanan rata-rata untuk pelanggan.'),
  outstandingBalance: z.number().describe('Saldo terutang saat ini untuk pelanggan.'),
});

export type DelinquencyPredictionInput = z.infer<typeof DelinquencyPredictionInputSchema>;

const DelinquencyPredictionOutputSchema = z.object({
  isDelinquentRisk: z.boolean().describe('Apakah pelanggan diprediksi berisiko tunggakan.'),
  riskScore: z.number().describe('Skor numerik yang mewakili risiko tunggakan pelanggan (0-100).'),
  reason: z.string().describe('Alasan prediksi risiko tunggakan.'),
});

export type DelinquencyPredictionOutput = z.infer<typeof DelinquencyPredictionOutputSchema>;

export async function delinquencyPrediction(input: DelinquencyPredictionInput): Promise<DelinquencyPredictionOutput> {
  return delinquencyPredictionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'delinquencyPredictionPrompt',
  input: {schema: DelinquencyPredictionInputSchema},
  output: {schema: DelinquencyPredictionOutputSchema},
  prompt: `You are an expert financial analyst specializing in predicting customer delinquency.

  Based on the following customer data, predict whether the customer is at risk of defaulting on payments. Provide a risk score between 0 and 100, and explain the reason for your prediction.

  Customer ID: {{{customerId}}}
  Payment History: {{{paymentHistory}}}
  Account Age (Months): {{{accountAgeMonths}}}
  Average Monthly Bill: {{{averageMonthlyBill}}}
  Outstanding Balance: {{{outstandingBalance}}}

  Consider factors such as payment history, account age, bill amount, and outstanding balance to determine the risk of delinquency.  The riskScore should be proportional to how likely the customer is to default.
  Set isDelinquentRisk to true if you assess that the customer is likely to default, and false otherwise.
  `,
});

const delinquencyPredictionFlow = ai.defineFlow(
  {
    name: 'delinquencyPredictionFlow',
    inputSchema: DelinquencyPredictionInputSchema,
    outputSchema: DelinquencyPredictionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
