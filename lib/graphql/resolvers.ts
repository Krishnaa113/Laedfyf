import { GraphQLError } from "graphql";
import { loadClientHub, loadClientList } from "@/lib/clients/hub";
import { loadCreatorHub, loadCreatorList } from "@/lib/creators/hub";
import { loadDashboardHub } from "@/lib/dashboard/hub";
import { loadEmployeeList } from "@/lib/employees/hub";
import { loadExpenseList } from "@/lib/expenses/hub";
import { loadOrderHub, loadOrderList } from "@/lib/orders/hub";
import { loadPaymentList } from "@/lib/payments/hub";
import { loadPayoutList } from "@/lib/payouts/hub";
import { canAccess, requireAccess, type AuthDenied, type AuthOk } from "@/lib/rbac";
import type { AccessModule } from "@/lib/roles";
import { loadScriptHub, loadScriptList } from "@/lib/scripts/hub";
import { loadShootHub, loadShootList } from "@/lib/shoots/hub";
import { loadTaskList } from "@/lib/tasks/hub";
import { loadTicketList } from "@/lib/tickets/hub";
import { loadUserList } from "@/lib/users/hub";
import { loadVideoHub, loadVideoList } from "@/lib/videos/hub";

const LIST_LIMIT = 100;

function denied(auth: AuthDenied): never {
  const status = auth.response.status;
  throw new GraphQLError(status === 401 ? "Sign in required" : "Not allowed", {
    extensions: {
      code: status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
      http: { status },
    },
  });
}

async function requireModule(module: AccessModule): Promise<AuthOk> {
  const auth = await requireAccess(module, "read");
  if (!auth.ok) {
    denied(auth);
  }
  return auth;
}

function take<T>(items: T[]) {
  return items.slice(0, LIST_LIMIT);
}

export const resolvers = {
  Query: {
    async me() {
      const auth = await requireModule("notifications");
      const user = auth.session.user;
      return {
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        role: user.role,
        employeeSubRole: user.employeeSubRole,
        clientId: user.clientId,
        employeeId: user.employeeId,
        permissions: user.permissions ?? [],
      };
    },

    async dashboard() {
      const auth = await requireModule("notifications");
      return loadDashboardHub(auth);
    },

    async clients(_: unknown, args: { q?: string; status?: string }) {
      const auth = await requireModule("clients");
      return take(await loadClientList(auth, args));
    },

    async client(_: unknown, args: { id: string }) {
      const auth = await requireModule("clients");
      const hub = await loadClientHub(auth, args.id);
      return hub?.client ?? null;
    },

    async orders(_: unknown, args: { q?: string; status?: string }) {
      const auth = await requireModule("orders");
      return take(await loadOrderList(auth, args));
    },

    async order(_: unknown, args: { id: string }) {
      const auth = await requireModule("orders");
      const hub = await loadOrderHub(auth, args.id);
      return hub?.order ?? null;
    },

    async scripts(_: unknown, args: { q?: string; status?: string }) {
      const auth = await requireModule("scripts");
      return take(await loadScriptList(auth, args));
    },

    async script(_: unknown, args: { id: string }) {
      const auth = await requireModule("scripts");
      const result = await loadScriptHub(auth, args.id);
      return result.ok ? result.hub.script : null;
    },

    async creators(_: unknown, args: { q?: string }) {
      const auth = await requireModule("creators");
      return take(
        await loadCreatorList({
          q: args.q,
          includePayout: canAccess(auth.session.user, "payouts", "read"),
        }),
      );
    },

    async creator(_: unknown, args: { id: string }) {
      const auth = await requireModule("creators");
      const hub = await loadCreatorHub(args.id, {
        includePayout: canAccess(auth.session.user, "payouts", "read"),
      });
      return hub?.creator ?? null;
    },

    async shoots(_: unknown, args: { q?: string; status?: string }) {
      const auth = await requireModule("shoots");
      return take(await loadShootList(auth, args));
    },

    async shoot(_: unknown, args: { id: string }) {
      const auth = await requireModule("shoots");
      const result = await loadShootHub(auth, args.id);
      return result.ok ? result.hub.shoot : null;
    },

    async videos(_: unknown, args: { q?: string; status?: string }) {
      const auth = await requireModule("videos");
      return take(await loadVideoList(auth, args));
    },

    async video(_: unknown, args: { id: string }) {
      const auth = await requireModule("videos");
      const result = await loadVideoHub(auth, args.id);
      return result.ok ? result.hub.video : null;
    },

    async tasks(_: unknown, args: { status?: string; priority?: string }) {
      const auth = await requireModule("tasks");
      return take(await loadTaskList(auth, args));
    },

    async payments(_: unknown, args: { status?: string }) {
      const auth = await requireModule("payments");
      return take(await loadPaymentList(auth, args));
    },

    async expenses(_: unknown, args: { category?: string }) {
      const auth = await requireModule("expenses");
      return take(await loadExpenseList(auth, args));
    },

    async payouts(_: unknown, args: { status?: string }) {
      const auth = await requireModule("payouts");
      return take(await loadPayoutList(auth, args));
    },

    async tickets(_: unknown, args: { status?: string }) {
      const auth = await requireModule("tickets");
      return take(await loadTicketList(auth, args));
    },

    async employees() {
      const auth = await requireModule("employees");
      return take(
        await loadEmployeeList({
          includeCompensation: canAccess(auth.session.user, "employees", "write"),
        }),
      );
    },

    async users() {
      await requireModule("users");
      return take(await loadUserList());
    },
  },
};
