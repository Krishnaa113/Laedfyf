import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { EXPENSE_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import { serializeExpense, type SerializedExpense } from "@/lib/serialize";
import { Expense } from "@/models/Expense";
import { User } from "@/models/User";

void User;

export async function loadExpenseList(auth: AuthOk, query: { category?: string } = {}) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (query.category) {
    filter.category = query.category;
  }

  const docs = await Expense.find(filter)
    .populate(EXPENSE_POPULATE)
    .sort({ date: -1, createdAt: -1 })
    .lean();

  void auth;

  return docs
    .map((doc) => serializeExpense(doc as Record<string, unknown>))
    .filter((expense): expense is SerializedExpense => Boolean(expense));
}
