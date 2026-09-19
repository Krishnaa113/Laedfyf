import { NextResponse } from "next/server";
import { executeGraphql } from "@/lib/graphql/execute";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function run(query?: string | null, variables?: Record<string, unknown> | null, operationName?: string | null) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { errors: [{ message: "Sign in required", extensions: { code: "UNAUTHENTICATED" } }] },
      { status: 401 },
    );
  }

  const result = await executeGraphql({ query, variables, operationName });
  const status = result.errors?.some(
    (error) => (error.extensions?.http as { status?: number } | undefined)?.status === 403,
  )
    ? 403
    : 200;
  return NextResponse.json(result, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!url.searchParams.get("query")) {
    return NextResponse.json({
      ok: true,
      endpoint: "/api/graphql",
      method: "POST",
      note: "REST stays the app API. Send a signed-in POST { query, variables }.",
    });
  }

  let variables: Record<string, unknown> | null = null;
  const raw = url.searchParams.get("variables");
  if (raw) {
    try {
      variables = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ errors: [{ message: "Invalid variables" }] }, { status: 400 });
    }
  }

  return run(url.searchParams.get("query"), variables, url.searchParams.get("operationName"));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    query?: string;
    variables?: Record<string, unknown>;
    operationName?: string;
  } | null;

  return run(body?.query, body?.variables ?? null, body?.operationName ?? null);
}
