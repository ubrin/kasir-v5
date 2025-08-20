
'use server';

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { parseISO, startOfMonth, isThisMonth } from "date-fns";

// Helper to safely parse dates from various formats
const parseDate = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  try {
    // Attempt to parse ISO string (e.g., '2023-10-27T10:00:00Z' or '2023-10-27')
    const date = parseISO(dateString);
    // Check if the parsed date is valid
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    // Catch potential errors from invalid string formats
    return null;
  }
};

// Helper to safely get numeric values, defaulting to 0 if invalid
const getNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
};

// The core logic for data aggregation, now made more robust
export async function runDataAggregation() {
  const db = admin.firestore();

  // Fetch all required data in parallel
  const [
    paymentsSnapshot,
    expensesSnapshot,
    otherIncomesSnapshot,
    customersSnapshot,
    invoicesSnapshot,
  ] = await Promise.all([
    db.collection("payments").get(),
    db.collection("expenses").where("date", "!=", null).get(), // CRITICAL FIX: Only fetch expenses that are records (have a date)
    db.collection("otherIncomes").get(),
    db.collection("customers").get(),
    db.collection("invoices").get(),
  ]);

  const today = new Date();
  const startOfCurrentMonth = startOfMonth(today);

  // --- Payments Calculation ---
  const totalPaymentIncome = paymentsSnapshot.docs.reduce((sum, doc) => sum + getNumber(doc.data().totalPayment), 0);
  
  const thisMonthPayments = paymentsSnapshot.docs.filter(doc => {
      const paymentDate = parseDate(doc.data().paymentDate);
      return paymentDate && isThisMonth(paymentDate);
  });
  const monthlyIncome = thisMonthPayments.reduce((sum, doc) => sum + getNumber(doc.data().totalPayment), 0);

  // --- Expenses Calculation ---
  // The query now only gets historical expenses, so no extra filtering is needed here.
  const totalExpense = expensesSnapshot.docs.reduce((sum, doc) => sum + getNumber(doc.data().amount), 0);
  
  const thisMonthExpenses = expensesSnapshot.docs.filter(doc => {
      const expenseDate = parseDate(doc.data().date);
      return expenseDate && isThisMonth(expenseDate);
  });
  const monthlyExpense = thisMonthExpenses.reduce((sum, doc) => sum + getNumber(doc.data().amount), 0);

  // --- Other Incomes Calculation ---
  const totalOtherIncome = otherIncomesSnapshot.docs.reduce((sum, doc) => sum + getNumber(doc.data().amount), 0);

  // --- Customer & Invoice Stats ---
  const newCustomers = customersSnapshot.docs.filter(doc => {
      const installDate = parseDate(doc.data().installationDate);
      return installDate && isThisMonth(installDate);
  });

  const oldUnpaidInvoices = invoicesSnapshot.docs.filter(doc => {
      const invoiceData = doc.data();
      // Ensure the invoice is unpaid and has a valid date before the current month
      if (invoiceData.status !== 'belum lunas') return false;
      const invoiceDate = parseDate(invoiceData.date);
      return invoiceDate && invoiceDate < startOfCurrentMonth;
  });

  const totalArrears = oldUnpaidInvoices.reduce((sum, doc) => sum + getNumber(doc.data().amount), 0);
  const totalOmset = customersSnapshot.docs.reduce((sum, doc) => sum + getNumber(doc.data().packagePrice), 0);

  // --- Final Stats Object ---
  const stats = {
    totalIncome: totalPaymentIncome + totalOtherIncome,
    totalExpense: totalExpense,
    balance: (totalPaymentIncome + totalOtherIncome) - totalExpense,
    monthlyIncome: monthlyIncome,
    monthlyExpense: monthlyExpense,
    netProfit: monthlyIncome - monthlyExpense,
    totalOmset: totalOmset,
    totalArrears: totalArrears,
    newCustomersCount: newCustomers.length,
    lastUpdated: new Date().toISOString(),
  };

  // Write the aggregated stats to a specific document in Firestore
  await db.collection("app-stats").doc("summary").set(stats, { merge: true });
  functions.logger.info("Successfully aggregated and saved statistics.", { stats });
}

// Scheduled function to run every hour
export const aggregateStats = functions.runWith({timeoutSeconds: 120, memory: '256MB'}).pubsub.schedule("every 60 minutes").onRun(async (context) => {
  functions.logger.info("Running scheduled data aggregation...");
  await runDataAggregation();
});

// Manually callable function for refreshing stats from the app
export const manuallyAggregateStats = functions.https.onCall(async (data, context) => {
  // Authentication check: ensure the user is logged in.
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  
  functions.logger.info("Manual data aggregation triggered by user:", context.auth.uid);
  try {
    await runDataAggregation();
    return { success: true, message: "Statistik berhasil diperbarui." };
  } catch (error) {
    functions.logger.error("Error during manual data aggregation:", error);
    throw new HttpsError("internal", "Gagal memperbarui statistik.", error);
  }
});
