export const PRE_SHOOT_CHECKLIST_KEYS = [
  "scriptApproved",
  "creatorConfirmed",
  "locationPermission",
  "clientProductReceived",
  "teamBriefed",
] as const;

export type PreShootChecklistKey = (typeof PRE_SHOOT_CHECKLIST_KEYS)[number];

export type PreShootChecklist = Record<PreShootChecklistKey, boolean>;

export const PRE_SHOOT_CHECKLIST_ITEMS: {
  key: PreShootChecklistKey;
  label: string;
}[] = [
  { key: "scriptApproved", label: "Script approved" },
  { key: "creatorConfirmed", label: "Creator confirmed" },
  { key: "locationPermission", label: "Location permission" },
  { key: "clientProductReceived", label: "Client product received" },
  { key: "teamBriefed", label: "Team briefed" },
];

export function emptyPreShootChecklist(): PreShootChecklist {
  return {
    scriptApproved: false,
    creatorConfirmed: false,
    locationPermission: false,
    clientProductReceived: false,
    teamBriefed: false,
  };
}

export function serializePreShootChecklist(value: unknown): PreShootChecklist {
  const source =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const checklist = emptyPreShootChecklist();
  for (const key of PRE_SHOOT_CHECKLIST_KEYS) {
    checklist[key] = Boolean(source[key]);
  }
  return checklist;
}

export function mergePreShootChecklist(
  current: unknown,
  patch: Partial<PreShootChecklist> | undefined,
): PreShootChecklist {
  return {
    ...serializePreShootChecklist(current),
    ...(patch ?? {}),
  };
}

export function isPreShootChecklistComplete(value: unknown): boolean {
  const checklist = serializePreShootChecklist(value);
  return PRE_SHOOT_CHECKLIST_KEYS.every((key) => checklist[key]);
}

export function incompleteChecklistLabels(value: unknown): string[] {
  const checklist = serializePreShootChecklist(value);
  return PRE_SHOOT_CHECKLIST_ITEMS.filter((item) => !checklist[item.key]).map(
    (item) => item.label,
  );
}

export function assertReadyForInProgress(checklist: unknown): {
  ok: true;
} | { ok: false; status: 400; error: string } {
  if (isPreShootChecklistComplete(checklist)) {
    return { ok: true };
  }

  const missing = incompleteChecklistLabels(checklist);
  return {
    ok: false,
    status: 400,
    error: `Complete the pre-shoot checklist before moving to In Progress (${missing.join(", ")})`,
  };
}
