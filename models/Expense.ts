import mongoose, { Schema } from "mongoose";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/status";
import { objectIdRef } from "@/lib/schema";

mongoose.set("overwriteModels", true);

const ExpenseSchema = new Schema(
  {
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    userId: objectIdRef("User"),
    date: { type: Date, required: true, index: true },
    receiptUrl: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true, strict: true },
);

export type ExpenseDocument = mongoose.InferSchemaType<typeof ExpenseSchema> & {
  _id: mongoose.Types.ObjectId;
  category: ExpenseCategory;
};

export const Expense = mongoose.model<ExpenseDocument>("Expense", ExpenseSchema);
