import { connectDB } from "@/lib/db";
import { CreatorPayout } from "@/models/CreatorPayout";
import { Expense } from "@/models/Expense";
import { Payment } from "@/models/Payment";

export type MonthlyPoint = {
  month: string;
  revenue: number;
  expenses: number;
};

export type ExecutiveAnalytics = {
  revenue: number;
  expenses: number;
  creatorPayouts: number;
  netProfit: number;
  totalReceivables: number;
  pendingInvoices: number;
  monthly: MonthlyPoint[];
};

function monthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

export async function loadExecutiveAnalytics(): Promise<ExecutiveAnalytics> {
  await connectDB();

  const [paymentTotals, expenseTotals, payoutTotals, monthlyRevenue, monthlyExpenses] =
    await Promise.all([
      Payment.aggregate<{
        revenue: number;
        totalReceivables: number;
        pendingInvoices: number;
      }>([
        {
          $group: {
            _id: null,
            revenue: { $sum: { $ifNull: ["$amountReceived", 0] } },
            totalReceivables: {
              $sum: {
                $max: [
                  {
                    $subtract: [
                      { $ifNull: ["$invoiceAmount", 0] },
                      { $ifNull: ["$amountReceived", 0] },
                    ],
                  },
                  0,
                ],
              },
            },
            pendingInvoices: {
              $sum: {
                $cond: [{ $ne: ["$status", "Paid"] }, 1, 0],
              },
            },
          },
        },
      ]),
      Expense.aggregate<{ expenses: number }>([
        {
          $group: {
            _id: null,
            expenses: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
      ]),
      CreatorPayout.aggregate<{ creatorPayouts: number }>([
        {
          $group: {
            _id: null,
            creatorPayouts: { $sum: { $ifNull: ["$totalPayout", 0] } },
          },
        },
      ]),
      Payment.aggregate<{ _id: string; revenue: number }>([
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m",
                date: { $ifNull: ["$paymentDate", "$createdAt"] },
              },
            },
            revenue: { $sum: { $ifNull: ["$amountReceived", 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Expense.aggregate<{ _id: string; expenses: number }>([
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m",
                date: { $ifNull: ["$date", "$createdAt"] },
              },
            },
            expenses: { $sum: { $ifNull: ["$amount", 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  const revenue = Number(paymentTotals[0]?.revenue ?? 0);
  const expenses = Number(expenseTotals[0]?.expenses ?? 0);
  const creatorPayouts = Number(payoutTotals[0]?.creatorPayouts ?? 0);
  const months = new Set<string>([
    ...monthlyRevenue.map((row) => row._id).filter(Boolean),
    ...monthlyExpenses.map((row) => row._id).filter(Boolean),
  ]);
  if (months.size === 0) {
    months.add(monthKey(new Date()));
  }

  const revenueByMonth = new Map(monthlyRevenue.map((row) => [row._id, row.revenue]));
  const expensesByMonth = new Map(
    monthlyExpenses.map((row) => [row._id, row.expenses]),
  );

  return {
    revenue,
    expenses,
    creatorPayouts,
    netProfit: revenue - expenses - creatorPayouts,
    totalReceivables: Number(paymentTotals[0]?.totalReceivables ?? 0),
    pendingInvoices: Number(paymentTotals[0]?.pendingInvoices ?? 0),
    monthly: [...months]
      .sort()
      .map((month) => ({
        month,
        revenue: Number(revenueByMonth.get(month) ?? 0),
        expenses: Number(expensesByMonth.get(month) ?? 0),
      })),
  };
}
