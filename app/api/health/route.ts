import { NextResponse } from "next/server";
import { connectDB, getDbReadyState } from "@/lib/db";

const READY_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

export async function GET() {
  try {
    await connectDB();
    const readyState = getDbReadyState();

    return NextResponse.json({
      ok: readyState === 1,
      service: "leadyfy-os",
      db: READY_STATES[readyState] ?? "unknown",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed.";

    return NextResponse.json(
      {
        ok: false,
        service: "leadyfy-os",
        db: "error",
        error: message,
      },
      { status: 500 },
    );
  }
}
