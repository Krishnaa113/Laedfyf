import { describe, expect, it, vi } from "vitest";
import {
  decryptPortalPassword,
  encryptPortalPassword,
  portalPasswordFields,
} from "@/lib/clients/portal-password";
import { serializeClient } from "@/lib/serialize";
import { authenticatePortalClient } from "@/lib/clients/invite";

const CLIENT_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";

const clientFind = vi.hoisted(() => vi.fn());
const userFindOne = vi.hoisted(() => vi.fn());
const userCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/Client", () => ({
  Client: {
    find: (...args: unknown[]) => clientFind(...args),
  },
}));
vi.mock("@/models/User", () => ({
  User: {
    findOne: (...args: unknown[]) => userFindOne(...args),
    create: (...args: unknown[]) => userCreate(...args),
  },
}));

describe("admin-set portal passwords", () => {
  it("encrypts a password so owner/admin can reveal it later", async () => {
    const fields = await portalPasswordFields("Client@123");
    expect(fields.passwordSet).toBe(true);
    expect(fields.passwordCipher.startsWith("v1:")).toBe(true);
    expect(decryptPortalPassword(fields.passwordCipher)).toBe("Client@123");
    expect(encryptPortalPassword("Client@123")).not.toBe(fields.passwordCipher);
  });

  it("omits the recoverable password unless owner/admin serializes it", () => {
    const doc = {
      _id: CLIENT_ID,
      name: "Northstar Contact",
      companyName: "Northstar UGC Studio",
      email: "northstar@example.com",
      passwordSet: true,
    };
    expect(serializeClient(doc)).not.toHaveProperty("portalPassword");
    expect(
      serializeClient(doc, { portalPassword: "Client@123" })?.portalPassword,
    ).toBe("Client@123");
  });

  it("authenticates portal login with client name", async () => {
    userFindOne.mockResolvedValue(null);
    userCreate.mockResolvedValue({ _id: "bbbbbbbbbbbbbbbbbbbbbbbb" });
    clientFind.mockReturnValue({
      select: vi.fn().mockResolvedValue([
        {
          _id: CLIENT_ID,
          name: "Northstar Contact",
          companyName: "Northstar UGC Studio",
          email: "northstar@example.com",
          passwordSet: true,
          passwordHash: await (
            await import("bcryptjs")
          ).default.hash("Client@123", 4),
        },
      ]),
    });

    const result = await authenticatePortalClient(
      "Northstar Contact",
      "Client@123",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.clientId).toBe(CLIENT_ID);
      expect(result.user.email).toBe("northstar@example.com");
    }
  });
});
