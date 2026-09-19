export function isDuplicateKeyError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? Number((error as { code?: unknown }).code) : 0;
  return code === 11000;
}
