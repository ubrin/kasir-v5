
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

// Initialize admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

interface Customer {
  id: string;
  name: string;
  packagePrice: number;
  dueDateCode: number;
}

interface Invoice {
    customerId: string;
    customerName: string;
    date: string; // 'yyyy-MM-dd'
    dueDate: string; // 'yyyy-MM-dd'
    amount: number;
    status: 'lunas' | 'belum lunas';
}

// This function will run at 01:01 on the 1st day of every month.
// The cron string format is (min, hour, day, month, day-of-week)
export const generateMonthlyInvoices = onSchedule("1 1 1 * *", async (event) => {
  logger.info("Starting monthly invoice generation job.");

  const customersSnapshot = await db.collection("customers").get();
  if (customersSnapshot.empty) {
    logger.info("No customers found. Exiting job.");
    return;
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthStr = String(month + 1).padStart(2, '0');
  const yearStr = String(year);
  
  // A string representing the first day of the current month, e.g., '2024-08-01'
  const currentInvoiceMonth = `${yearStr}-${monthStr}-01`;

  const batch = db.batch();
  let invoicesCreatedCount = 0;

  for (const doc of customersSnapshot.docs) {
    const customer = { id: doc.id, ...doc.data() } as Customer;

    // Check if an invoice for the current month already exists for this customer
    const invoiceQuery = db.collection("invoices")
      .where("customerId", "==", customer.id)
      .where("date", "==", currentInvoiceMonth);
      
    const existingInvoiceSnapshot = await invoiceQuery.get();

    if (existingInvoiceSnapshot.empty && customer.packagePrice > 0) {
      // No invoice for this month, let's create one.
      const dueDate = new Date(year, month, customer.dueDateCode);

      const newInvoice: Invoice = {
        customerId: customer.id,
        customerName: customer.name,
        date: currentInvoiceMonth,
        dueDate: dueDate.toISOString().split('T')[0], // format to 'yyyy-MM-dd'
        amount: customer.packagePrice,
        status: 'belum lunas',
      };

      const newInvoiceRef = db.collection("invoices").doc();
      batch.set(newInvoiceRef, newInvoice);
      invoicesCreatedCount++;
      logger.info(`Scheduled invoice creation for customer: ${customer.name} (${customer.id})`);

    } else {
       logger.info(`Invoice for ${currentInvoiceMonth} already exists for customer: ${customer.name} (${customer.id}). Skipping.`);
    }
  }

  if (invoicesCreatedCount > 0) {
    await batch.commit();
    logger.info(`Successfully created ${invoicesCreatedCount} new invoices.`);
  } else {
    logger.info("No new invoices needed to be created.");
  }

  return null;
});
