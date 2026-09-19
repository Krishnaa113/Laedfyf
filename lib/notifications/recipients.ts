import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";

function asId(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "object" && value && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  const id = String(value);
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

export async function staffUserIds() {
  await connectDB();
  const users = await User.find({
    role: { $in: ["owner", "admin"] },
    isActive: { $ne: false },
  })
    .select("_id")
    .lean();
  return users.map((user) => String(user._id));
}

export async function userIdsFromEmployees(
  employeeIds: Array<string | null | undefined>,
) {
  const ids = employeeIds.map(asId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) {
    return [];
  }

  await connectDB();
  const employees = await Employee.find({ _id: { $in: ids } })
    .select("userId")
    .lean();

  return employees
    .map((employee) => asId(employee.userId))
    .filter((id): id is string => Boolean(id));
}

export async function clientUserIds(clientId?: string | null) {
  const id = asId(clientId);
  if (!id) {
    return [];
  }

  await connectDB();
  const users = await User.find({
    role: "client",
    clientId: id,
    isActive: { $ne: false },
  })
    .select("_id")
    .lean();
  return users.map((user) => String(user._id));
}

export async function mergeUserIds(...groups: string[][]) {
  return [...new Set(groups.flat().filter(Boolean))];
}
