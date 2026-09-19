import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import bcrypt from "bcryptjs";

const PREFIX = "v1";

function encryptionKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET");
  }
  return scryptSync(secret, "leadyfy-portal-password", 32);
}

export function encryptPortalPassword(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptPortalPassword(stored?: string | null) {
  if (!stored) {
    return null;
  }
  const [version, ivHex, tagHex, dataHex] = stored.split(":");
  if (version !== PREFIX || !ivHex || !tagHex || !dataHex) {
    return null;
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decoded = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return decoded.toString("utf8");
  } catch {
    return null;
  }
}

export async function portalPasswordFields(plain: string) {
  const passwordHash = await bcrypt.hash(plain, 12);
  return {
    passwordHash,
    passwordCipher: encryptPortalPassword(plain),
    passwordSet: true as const,
  };
}
