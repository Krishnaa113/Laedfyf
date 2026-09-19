import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { loadExpenseList } from "@/lib/expenses/hub";
import { EXPENSE_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeExpense } from "@/lib/serialize";
import { EXPENSE_CATEGORIES } from "@/lib/status";
import { saveReceiptUpload } from "@/lib/uploads";
import { expenseInputSchema } from "@/lib/validators/expense";
import { Expense } from "@/models/Expense";

function formValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function GET(request: Request) {
  const auth = await requireAccess("expenses", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "";
  const expenses = await loadExpenseList(auth, {
    category: EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])
      ? category
      : undefined,
  });

  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  const auth = await requireAccess("expenses", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const contentType = request.headers.get("content-type") ?? "";
  let payload: unknown;
  let receiptFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    payload = {
      category: formValue(form, "category"),
      amount: formValue(form, "amount"),
      date: formValue(form, "date"),
      receiptUrl: formValue(form, "receiptUrl"),
      notes: formValue(form, "notes"),
    };
    const file = form.get("receipt");
    if (file instanceof File && file.size > 0) {
      receiptFile = file;
    }
  } else {
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  const parsed = expenseInputSchema.safeParse(payload);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  let receiptUrl = parsed.data.receiptUrl;
  if (receiptFile) {
    const saved = await saveReceiptUpload(receiptFile);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    receiptUrl = saved.url;
  }

  await connectDB();

  const created = await Expense.create({
    category: parsed.data.category,
    amount: parsed.data.amount,
    userId: mongoose.Types.ObjectId.isValid(auth.session.user.id)
      ? auth.session.user.id
      : undefined,
    date: parsed.data.date ?? new Date().toISOString(),
    receiptUrl,
    notes: parsed.data.notes,
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "expense.created",
    entityType: "Expense",
    entityId: created._id,
    metadata: { category: parsed.data.category, amount: parsed.data.amount },
  });

  const populated = await Expense.findById(created._id)
    .populate(EXPENSE_POPULATE)
    .lean();

  return NextResponse.json(
    { expense: serializeExpense(populated as Record<string, unknown> | null) },
    { status: 201 },
  );
}
