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
  customerId: z.string().describe('The unique identifier for the customer.'),
  paymentHistory: z.string().describe('A history of the customer\'s payments, including dates and amounts.'),
  accountAgeMonths: z.number().describe('The age of the customer\'s account in months.'),
  averageMonthlyBill: z.number().describe('The average monthly bill amount for the customer.'),
  outstandingBalance: z.number().describe('The current outstanding balance for the customer.'),
});

export type DelinquencyPredictionInput = z.infer<typeof DelinquencyPredictionInputSchema>;

const DelinquencyPredictionOutputSchema = z.object({
  isDelinquentRisk: z.boolean().describe('Whether the customer is predicted to be at risk of delinquency.'),
  riskScore: z.number().describe('A numerical score representing the customer\'s risk of delinquency (0-100).'),
  reason: z.string().describe('The reason for the delinquency risk prediction.'),
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
