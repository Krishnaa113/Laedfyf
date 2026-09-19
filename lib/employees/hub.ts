import { connectDB } from "@/lib/db";
import { serializeEmployee, type SerializedEmployee } from "@/lib/serialize";
import { Employee } from "@/models/Employee";
import { User } from "@/models/User";

void User;

export async function loadEmployeeList(options: { includeCompensation?: boolean } = {}) {
  await connectDB();
  const docs = await Employee.find({})
    .populate({ path: "userId", select: "name email role employeeSubRole isActive" })
    .sort({ createdAt: -1 })
    .lean();

  return docs
    .map((doc) =>
      serializeEmployee(doc, { includeCompensation: options.includeCompensation }),
    )
    .filter((employee): employee is SerializedEmployee => Boolean(employee));
}

export async function loadEmployeeHub(
  employeeId: string,
  options: { includeCompensation?: boolean } = {},
) {
  await connectDB();
  const doc = await Employee.findById(employeeId)
    .populate({ path: "userId", select: "name email role employeeSubRole isActive" })
    .lean();
  if (!doc) {
    return null;
  }
  return serializeEmployee(doc, { includeCompensation: options.includeCompensation });
}
