import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import {
  authenticatePortalClient,
  INVITE_REQUIRED_ERROR,
  USE_PORTAL_LOGIN_ERROR,
} from "@/lib/clients/invite";
import { User } from "@/models/User";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import type { EmployeeSubRole, Permission, UserRole } from "@/lib/roles";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        clientName: { label: "Client name", type: "text" },
        password: { label: "Password", type: "password" },
        intent: { label: "Intent", type: "text" },
      },
      async authorize(credentials) {
        const identifier =
          credentials?.clientName?.trim() || credentials?.email?.trim();
        const password = credentials?.password;
        const intent = credentials?.intent === "portal" ? "portal" : "staff";

        if (!identifier || !password) {
          return null;
        }

        await connectDB();

        if (intent === "portal") {
          const result = await authenticatePortalClient(identifier, password);
          if (!result.ok && result.error === "invite") {
            throw new Error(INVITE_REQUIRED_ERROR);
          }
          if (!result.ok) {
            return null;
          }
          return result.user;
        }

        const email = identifier.trim().toLowerCase();
        const user = await User.findOne({ email }).select("+passwordHash");
        if (user?.role === "client") {
          throw new Error(USE_PORTAL_LOGIN_ERROR);
        }

        if (user?.passwordHash && user.isActive) {
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return null;
          }
          const employee =
            user.role === "employee"
              ? await Employee.findOne({ userId: user._id }).select("_id").lean()
              : null;
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            employeeSubRole:
              (user.employeeSubRole as EmployeeSubRole | null) ?? null,
            clientId: user.clientId ? String(user.clientId) : null,
            employeeId: employee ? String(employee._id) : null,
            permissions: (user.permissions as Permission[] | undefined) ?? [],
          };
        }

        const client = await Client.findOne({ email }).select("_id");
        if (client) {
          throw new Error(USE_PORTAL_LOGIN_ERROR);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employeeSubRole = user.employeeSubRole;
        token.clientId = user.clientId;
        token.employeeId = user.employeeId;
        token.permissions = user.permissions ?? [];
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.employeeSubRole = token.employeeSubRole;
        session.user.clientId = token.clientId;
        session.user.employeeId = token.employeeId ?? null;
        session.user.permissions = token.permissions ?? [];
        session.user.email = token.email as string | null | undefined;
        session.user.name = token.name as string | null | undefined;
      }
      return session;
    },
  },
};
