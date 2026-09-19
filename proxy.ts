import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isClientRole, isInternalRole } from "@/lib/roles";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isLogin = pathname === "/login";
  const isPortalLogin = pathname === "/portal/login";
  const isPortalSetPassword = pathname.startsWith("/portal/set-password");
  const isPortalPublic = isPortalLogin || isPortalSetPassword;
  const isInternal =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/scripts") ||
    pathname.startsWith("/creators") ||
    pathname.startsWith("/shoots") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/expenses") ||
    pathname.startsWith("/payouts") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/employees") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/tickets");
  const isPortal = pathname.startsWith("/portal");

  if (!token && (isInternal || (isPortal && !isPortalPublic))) {
    const loginUrl = new URL(isPortal ? "/portal/login" : "/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && (isLogin || isPortalLogin)) {
    const destination = isClientRole(token.role) ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (token && isInternal && !isInternalRole(token.role)) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  if (token && isPortal && !isPortalPublic && !isClientRole(token.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/login",
    "/dashboard",
    "/dashboard/:path*",
    "/clients",
    "/clients/:path*",
    "/orders",
    "/orders/:path*",
    "/scripts",
    "/scripts/:path*",
    "/creators",
    "/creators/:path*",
    "/shoots",
    "/shoots/:path*",
    "/videos",
    "/videos/:path*",
    "/tasks",
    "/tasks/:path*",
    "/payments",
    "/payments/:path*",
    "/expenses",
    "/expenses/:path*",
    "/payouts",
    "/payouts/:path*",
    "/analytics",
    "/analytics/:path*",
    "/notifications",
    "/notifications/:path*",
    "/employees",
    "/employees/:path*",
    "/users",
    "/users/:path*",
    "/tickets",
    "/tickets/:path*",
    "/portal",
    "/portal/:path*",
  ],
};
