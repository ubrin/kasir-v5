
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

async function runInvoiceGeneration() {
  logger.info("Starting monthly invoice generation job.");

  const customersSnapshot = await db.collection("customers").get();
  if (customersSnapshot.empty) {
    logger.info("No customers found. Exiting job.");
    return "No customers found.";
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthStr = String(month + 1).padStart(2, '0');
  const yearStr = String(year);
  
  const currentInvoiceMonth = `${yearStr}-${monthStr}-01`;

  const batch = db.batch();
  let invoicesCreatedCount = 0;

  const invoiceQuery = db.collection("invoices").where("date", ">=", currentInvoiceMonth);
  const existingInvoicesSnapshot = await invoiceQuery.get();
  const existingInvoices = existingInvoicesSnapshot.docs.map(doc => ({ ...doc.data() as Invoice, id: doc.id }));

  for (const doc of customersSnapshot.docs) {
    const customer = { id: doc.id, ...doc.data() } as Customer;

    const alreadyExists = existingInvoices.some(inv => inv.customerId === customer.id && inv.date === currentInvoiceMonth);
    
    if (!alreadyExists && customer.packagePrice > 0) {
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
       if (alreadyExists) {
        logger.info(`Invoice for ${currentInvoiceMonth} already exists for customer: ${customer.name} (${customer.id}). Skipping.`);
       }
    }
  }

  if (invoicesCreatedCount > 0) {
    await batch.commit();
    const successMessage = `Successfully created ${invoicesCreatedCount} new invoices.`;
    logger.info(successMessage);
    return successMessage;
  } else {
    const noNewMessage = "No new invoices needed to be created.";
    logger.info(noNewMessage);
    return noNewMessage;
  }
}

// This function will run at 01:01 on the 1st day of every month.
export const generateMonthlyInvoices = onSchedule("1 1 1 * *", async (event) => {
  await runInvoiceGeneration();
  return null;
});

// This is a callable function that can be triggered manually from the client
// export const manuallyGenerateInvoices = onCall({
//     // We can add security here later, e.g., allow only admins
// }, async (request) => {
//     try {
//         const result = await runInvoiceGeneration();
//         return { success: true, message: result };
//     } catch (error) {
//         logger.error("Manual invoice generation failed", error);
//         throw new functions.https.HttpsError("internal", "Failed to generate invoices", error);
//     }
// });
