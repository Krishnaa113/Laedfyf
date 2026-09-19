import type { SerializeAudience } from "@/lib/serialize";


export function internalHref(entityType: string, entityId?: string | null) {
  if (!entityId) {
    return "";
  }
  switch (entityType) {
    case "Client":
      return `/clients/${entityId}`;
    case "Script":
      return `/scripts/${entityId}`;
    case "Shoot":
      return `/shoots/${entityId}`;
    case "Video":
      return `/videos/${entityId}`;
    case "Payment":
      return `/payments/${entityId}`;
    default:
      return "";
  }
}

export function audienceHref(
  entityType: string,
  entityId: string | null | undefined,
  audience: SerializeAudience = "internal",
) {
  const internal = internalHref(entityType, entityId);
  if (audience !== "portal") {
    return internal;
  }
  switch (entityType) {
    case "Script":
      return entityId ? `/portal/scripts/${entityId}` : "/portal/scripts";
    case "Video":
      return entityId ? `/portal/videos/${entityId}` : "/portal/videos";
    case "Payment":
      return "/portal/invoices";
    default:
      return "/portal";
  }
}
