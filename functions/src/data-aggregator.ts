
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

const db = admin.firestore();

// Helper function to parse date strings safely
const parseDate = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
};

// Helper function to check if a date is in the current month and year
const isThisMonth = (date: Date, today: Date): boolean => {
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

async function runDataAggregation() {
    logger.info("Starting data aggregation job.");

    try {
        const [
            paymentsSnapshot,
            expensesSnapshot,
            otherIncomesSnapshot,
            customersSnapshot,
            invoicesSnapshot,
        ] = await Promise.all([
            db.collection("payments").get(),
            db.collection("expenses").where("date", "!=", null).get(),
            db.collection("otherIncomes").get(),
            db.collection("customers").get(),
            db.collection("invoices").get(),
        ]);

        const payments = paymentsSnapshot.docs.map(doc => doc.data());
        const expenses = expensesSnapshot.docs.map(doc => doc.data());
        const otherIncomes = otherIncomesSnapshot.docs.map(doc => doc.data());
        const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const today = new Date();
        const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // --- GLOBAL STATS ---
        const totalPaymentIncome = payments.reduce((sum, p) => sum + (p.totalPayment || p.paidAmount || 0), 0);
        const totalOtherIncome = otherIncomes.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalIncome = totalPaymentIncome + totalOtherIncome;
        const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const balance = totalIncome - totalExpense;

        // --- MONTHLY STATS ---
        const thisMonthPayments = payments.filter(p => {
            const paymentDate = parseDate(p.paymentDate);
            return paymentDate && isThisMonth(paymentDate, today);
        });
        const monthlyIncome = thisMonthPayments.reduce((sum, p) => sum + (p.totalPayment || p.paidAmount || 0), 0);
        
        const thisMonthExpenses = expenses.filter(e => {
            const expenseDate = parseDate(e.date);
            return expenseDate && isThisMonth(expenseDate, today);
        });
        const monthlyExpense = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netProfit = monthlyIncome - monthlyExpense;

        // --- CUSTOMER & INVOICE STATS ---
        const newCustomers = customers.filter(c => {
            const installationDate = parseDate(c.installationDate);
            return installationDate && isThisMonth(installationDate, today);
        }).map(c => ({
            id: c.id,
            name: c.name,
            subscriptionMbps: c.subscriptionMbps,
            packagePrice: c.packagePrice,
        }));

        const oldUnpaidInvoices = invoices.filter(invoice => {
            const invoiceDate = parseDate(invoice.date);
            return invoiceDate && invoice.status === 'belum lunas' && invoiceDate < startOfCurrentMonth;
        });

        const arrearsByCustomer: { [id: string]: { id: string, name: string, amount: number } } = {};
        oldUnpaidInvoices.forEach(invoice => {
            if (!arrearsByCustomer[invoice.customerId]) {
                arrearsByCustomer[invoice.customerId] = {
                    id: invoice.customerId,
                    name: invoice.customerName,
                    amount: 0,
                };
            }
            arrearsByCustomer[invoice.customerId].amount += invoice.amount || 0;
        });
        const arrearsDetails = Object.values(arrearsByCustomer).sort((a,b) => b.amount - a.amount);
        const totalArrears = arrearsDetails.reduce((acc, detail) => acc + detail.amount, 0);

        const totalOmset = customers.reduce((acc, c) => acc + (c.packagePrice || 0), 0);
        
        const omsetBreakdown: { [key: string]: { subscriptionMbps: number; packagePrice: number; count: number; total: number } } = {};
        customers.forEach(c => {
            const key = `${c.subscriptionMbps}-${c.packagePrice}`;
            if (!omsetBreakdown[key]) {
                omsetBreakdown[key] = {
                    subscriptionMbps: c.subscriptionMbps,
                    packagePrice: c.packagePrice,
                    count: 0,
                    total: 0
                };
            }
            omsetBreakdown[key].count++;
            omsetBreakdown[key].total += c.packagePrice || 0;
        });
        const omsetDetails = Object.values(omsetBreakdown).sort((a,b) => b.total - a.total);

        // --- CHART DATA ---
        const thisMonthInvoices = invoices.filter(invoice => {
            const invoiceDate = parseDate(invoice.date);
            return invoiceDate && isThisMonth(invoiceDate, today);
        });
        const paidInvoicesStats = thisMonthInvoices.filter(i => i.status === 'lunas').reduce((acc, inv) => ({ count: acc.count + 1, amount: acc.amount + (inv.amount || 0) }), { count: 0, amount: 0 });
        const unpaidInvoicesStats = thisMonthInvoices.filter(i => i.status === 'belum lunas').reduce((acc, inv) => ({ count: acc.count + 1, amount: acc.amount + (inv.amount || 0) }), { count: 0, amount: 0 });
        const pieData = [
            { name: 'Lunas', value: paidInvoicesStats.amount, count: paidInvoicesStats.count },
            { name: 'Belum Lunas', value: unpaidInvoicesStats.amount, count: unpaidInvoicesStats.count },
        ];

        const revenueDataByMonth: { [key: string]: number } = {};
        const monthNames = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthName = d.toLocaleString('id-ID', { month: 'short' });
            monthNames.push(monthName);
            revenueDataByMonth[monthName] = 0;
        }

        payments.forEach(p => {
            const paymentDate = parseDate(p.paymentDate);
            if (paymentDate && (today.getTime() - paymentDate.getTime()) < (6 * 30 * 24 * 60 * 60 * 1000)) {
                const monthName = paymentDate.toLocaleString('id-ID', { month: 'short' });
                 if (revenueDataByMonth.hasOwnProperty(monthName)) {
                    revenueDataByMonth[monthName] += (p.totalPayment || p.paidAmount || 0);
                }
            }
        });
        const monthlyRevenueData = monthNames.map(month => ({ month, revenue: revenueDataByMonth[month] }));

        const summaryData = {
            totalIncome,
            totalExpense,
            totalOtherIncome,
            balance,
            monthlyIncome,
            monthlyExpense,
            netProfit,
            totalOmset,
            totalArrears,
            newCustomersCount: newCustomers.length,
            monthlyRevenueData,
            pieData,
            arrearsDetails,
            omsetDetails,
            newCustomers,
            lastUpdated: new Date().toISOString(),
        };

        const statsRef = db.collection("app-stats").doc("summary");
        await statsRef.set(summaryData);

        logger.info("Successfully aggregated and saved stats.", {
            totalIncome,
            monthlyIncome,
            newCustomers: newCustomers.length,
        });
        return { success: true, message: "Data aggregation successful." };

    } catch (error) {
        logger.error("Error during data aggregation:", error);
        throw new HttpsError("internal", `Error during data aggregation: ${error}`);
    }
}


export const aggregateStats = onSchedule("every 60 minutes", async (event) => {
    await runDataAggregation();
    return null;
});

export const manuallyAggregateStats = onCall(async (request) => {
    // Optional: Add authentication checks if needed
    // e.g., if (!request.auth) { throw new HttpsError('unauthenticated', 'The function must be called while authenticated.'); }
    return await runDataAggregation();
});
