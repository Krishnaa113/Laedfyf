import mongoose, { Schema } from "mongoose";
import { objectIdRef } from "@/lib/schema";

const EmployeeSchema = new Schema(
  {
    userId: {
      ...objectIdRef("User", { required: true }),
      unique: true,
    },
    jobTitle: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    salary: { type: Number, default: 0, min: 0 },
    joiningDate: { type: Date, default: null },
    phone: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: true },
);

export type EmployeeDocument = mongoose.InferSchemaType<typeof EmployeeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Employee =
  mongoose.models.Employee ??
  mongoose.model<EmployeeDocument>("Employee", EmployeeSchema);
