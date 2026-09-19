import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/rbac";
import { Notification } from "@/models/Notification";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, context: RouteContext) {
  const auth = await requireAccess("notifications", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid notification id" }, { status: 400 });
  }

  await connectDB();
  const updated = await Notification.findOneAndUpdate(
    { _id: id, userId: auth.session.user.id },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
