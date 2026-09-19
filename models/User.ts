import mongoose, { Schema } from "mongoose";
import {
  EMPLOYEE_SUB_ROLES,
  PERMISSIONS,
  USER_ROLES,
  defaultPermissionsForRole,
  type EmployeeSubRole,
  type Permission,
  type UserRole,
} from "@/lib/roles";
import { objectIdRef } from "@/lib/schema";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "employee",
      index: true,
    },
    employeeSubRole: {
      type: String,
      enum: EMPLOYEE_SUB_ROLES,
      default: null,
    },
    clientId: objectIdRef("Client"),
    permissions: {
      type: [String],
      enum: PERMISSIONS,
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, strict: true },
);

UserSchema.pre("validate", function setDefaultPermissions() {
  if (!this.permissions || this.permissions.length === 0) {
    this.permissions = defaultPermissionsForRole(
      this.role as UserRole,
      (this.employeeSubRole as EmployeeSubRole | null) ?? null,
    );
  }
});

export type UserDocument = mongoose.InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
  role: UserRole;
  employeeSubRole: EmployeeSubRole | null;
  permissions: Permission[];
};

export const User =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", UserSchema);
