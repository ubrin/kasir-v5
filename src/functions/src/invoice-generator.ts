
'use server';

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { format, startOfMonth, getMonth, getYear, isThisMonth, isThisYear, parseISO } from "date-fns";
import { HttpsError } from "firebase-functions/v2/https";

type Customer = {
  id: string;
  name: string;
  dueDateCode: number;
  packagePrice: number;
  installationDate: string;
};

type Invoice = {
  id: string;
  customerId: string;
  date: string;
  status: 'belum lunas' | 'lunas';
};

async function runInvoiceGeneration() {
  functions.logger.info("Starting monthly invoice generation logic...");

  const db = admin.firestore();
  const today = new Date();
  const currentMonth = getMonth(today);
  const currentYear = getYear(today);
  const currentMonthStr = format(today, 'yyyy-MM');

  const [customersSnapshot, allInvoicesSnapshot] = await Promise.all([
    db.collection("customers").get(),
    db.collection("invoices").get() // Get all invoices
  ]);

  if (customersSnapshot.empty) {
    functions.logger.info("No customers found. Exiting job.");
    return { success: true, message: "Tidak ada pelanggan yang ditemukan.", invoicesCreatedCount: 0 };
  }
  
  // Filter invoices for the current month in code for reliability
  const existingInvoicesForThisMonth = new Set<string>();
  allInvoicesSnapshot.forEach(doc => {
      const invoice = doc.data() as Invoice;
      if (invoice.date) {
        const invoiceDate = parseISO(invoice.date);
        if (isThisMonth(invoiceDate) && isThisYear(invoiceDate)) {
          existingInvoicesForThisMonth.add(invoice.customerId);
        }
      }
  });

  const batch = db.batch();
  let invoicesCreatedCount = 0;

  for (const doc of customersSnapshot.docs) {
    const customer = { id: doc.id, ...doc.data() } as Customer;

    // Check if an invoice for this customer already exists for this month
    if (existingInvoicesForThisMonth.has(customer.id)) {
      functions.logger.info(`Invoice for customer ${customer.id} for ${currentMonthStr} already exists. Skipping.`);
      continue;
    }
    
    if (!customer.packagePrice || customer.packagePrice <= 0) {
      functions.logger.info(`Customer ${customer.id} has no package price. Skipping.`);
      continue;
    }

    const installationDate = new Date(customer.installationDate);
    if (installationDate > today) {
        functions.logger.info(`Customer ${customer.id} installation date is in the future. Skipping.`);
        continue;
    }

    const invoiceDate = startOfMonth(today);
    const invoiceDueDate = new Date(currentYear, currentMonth, customer.dueDateCode);
    
    const newInvoice = {
      customerId: customer.id,
      customerName: customer.name,
      date: format(invoiceDate, 'yyyy-MM-dd'),
      dueDate: format(invoiceDueDate, 'yyyy-MM-dd'),
      amount: customer.packagePrice,
      status: 'belum lunas' as const,
    };

    const invoiceRef = db.collection("invoices").doc();
    batch.set(invoiceRef, newInvoice);
    invoicesCreatedCount++;
  }

  if (invoicesCreatedCount > 0) {
    await batch.commit();
    const message = `Successfully created ${invoicesCreatedCount} new invoices for ${currentMonthStr}.`;
    functions.logger.info(message);
    return { success: true, message: "Faktur berhasil diterbitkan.", invoicesCreatedCount };
  } else {
    const message = "No new invoices needed to be created for this month.";
    functions.logger.info(message);
    return { success: true, message: "Semua faktur untuk bulan ini sudah ada.", invoicesCreatedCount: 0 };
  }
}

// Scheduled function
export const generateMonthlyInvoices = functions.runWith({timeoutSeconds: 300, memory: '256MB'}).pubsub.schedule("0 1 1 * *").timeZone('Asia/Jakarta').onRun(async (context) => {
  try {
    await runInvoiceGeneration();
  } catch (error) {
    functions.logger.error("Error during scheduled invoice generation:", error);
  }
});

// Manually callable function
export const manuallyGenerateInvoices = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  
  functions.logger.info("Manual invoice generation triggered by user:", context.auth.uid);
  try {
    const result = await runInvoiceGeneration();
    return result;
  } catch (error) {
    functions.logger.error("Error during manual invoice generation:", error);
    throw new HttpsError("internal", "Gagal menerbitkan faktur.", error);
  }
});
