
'use server';

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { format, startOfMonth, getMonth, getYear } from "date-fns";

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

// Fungsi terjadwal untuk berjalan pada hari pertama setiap bulan pukul 01:00 pagi.
// "0 1 1 * *" adalah notasi cron untuk "at 01:00 on day-of-month 1".
export const generateMonthlyInvoices = functions.runWith({timeoutSeconds: 300, memory: '256MB'}).pubsub.schedule("0 1 1 * *").timeZone('Asia/Jakarta').onRun(async (context) => {
  functions.logger.info("Starting monthly invoice generation job...");

  const db = admin.firestore();
  const today = new Date();
  const currentMonth = getMonth(today);
  const currentYear = getYear(today);
  const currentMonthStr = format(today, 'yyyy-MM'); // e.g., "2024-07"

  try {
    const customersSnapshot = await db.collection("customers").get();
    if (customersSnapshot.empty) {
      functions.logger.info("No customers found. Exiting job.");
      return;
    }

    const customerIds = customersSnapshot.docs.map(doc => doc.id);

    // Dapatkan semua faktur untuk bulan ini untuk memeriksa mana yang sudah ada
    const invoicesQuery = await db.collection("invoices")
      .where("date", ">=", format(startOfMonth(today), 'yyyy-MM-dd'))
      .where("date", "<=", format(today, 'yyyy-MM-dd'))
      .get();
      
    const existingInvoices = new Set<string>();
    invoicesQuery.forEach(doc => {
        const invoice = doc.data();
        // Buat kunci unik per pelanggan per bulan
        existingInvoices.add(`${invoice.customerId}_${currentMonthStr}`);
    });

    const batch = db.batch();
    let invoicesCreatedCount = 0;

    for (const doc of customersSnapshot.docs) {
      const customer = { id: doc.id, ...doc.data() } as Customer;
      const customerInvoiceKey = `${customer.id}_${currentMonthStr}`;

      // Periksa apakah faktur untuk pelanggan ini di bulan ini sudah ada
      if (existingInvoices.has(customerInvoiceKey)) {
        functions.logger.info(`Invoice for customer ${customer.id} for ${currentMonthStr} already exists. Skipping.`);
        continue;
      }
      
      // Jangan buat faktur jika harga paket 0 atau tidak ada
      if (!customer.packagePrice || customer.packagePrice <= 0) {
        functions.logger.info(`Customer ${customer.id} has no package price. Skipping.`);
        continue;
      }

      // Jangan buat faktur jika tanggal pemasangan di masa depan
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

      const invoiceRef = db.collection("invoices").doc(); // Buat ID baru
      batch.set(invoiceRef, newInvoice);
      invoicesCreatedCount++;
    }

    if (invoicesCreatedCount > 0) {
      await batch.commit();
      functions.logger.info(`Successfully created ${invoicesCreatedCount} new invoices for ${currentMonthStr}.`);
    } else {
      functions.logger.info("No new invoices needed to be created for this month.");
    }

  } catch (error) {
    functions.logger.error("Error generating monthly invoices:", error);
    // Jika Anda memiliki sistem notifikasi error, panggil di sini.
  }
});
