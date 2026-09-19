"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CREATOR_AVAILABILITY_STATUSES,
  CREATOR_AVAILABILITY_LABELS,
  normalizeCreatorAvailability,
} from "@/lib/status";

export type CreatorFormValues = {
  name: string;
  photoUrl: string;
  gender: string;
  ageGroup: string;
  languages: string;
  location: string;
  niches: string;
  demographics: string;
  email: string;
  phone: string;
  rate: number;
  bankAccountName: string;
  bankAccountNumber: string;
  upiId: string;
  portfolioLinks: string;
  availability: string;
  isActive: boolean;
};

const EMPTY: CreatorFormValues = {
  name: "",
  photoUrl: "",
  gender: "",
  ageGroup: "",
  languages: "",
  location: "",
  niches: "",
  demographics: "",
  email: "",
  phone: "",
  rate: 0,
  bankAccountName: "",
  bankAccountNumber: "",
  upiId: "",
  portfolioLinks: "",
  availability: "Available",
  isActive: true,
};

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CreatorForm({
  initialValues,
  creatorId,
}: {
  initialValues?: Partial<CreatorFormValues>;
  creatorId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const values = { ...EMPTY, ...initialValues };
  const isEdit = Boolean(creatorId);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      photoUrl: String(formData.get("photoUrl") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      ageGroup: String(formData.get("ageGroup") ?? ""),
      languages: splitLines(String(formData.get("languages") ?? "")),
      location: String(formData.get("location") ?? ""),
      niches: splitLines(String(formData.get("niches") ?? "")),
      demographics: String(formData.get("demographics") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      rate: Number(formData.get("rate") ?? 0),
      bankAccountName: String(formData.get("bankAccountName") ?? ""),
      bankAccountNumber: String(formData.get("bankAccountNumber") ?? ""),
      upiId: String(formData.get("upiId") ?? ""),
      portfolioLinks: splitLines(String(formData.get("portfolioLinks") ?? "")),
      availability: String(formData.get("availability") ?? "Available"),
      isActive: formData.get("isActive") === "on",
    };

    const response = await fetch(
      isEdit ? `/api/creators/${creatorId}` : "/api/creators",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = (await response.json()) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
      creator?: { id: string };
    };

    if (!response.ok) {
      const fieldError = data.details?.fieldErrors
        ? Object.values(data.details.fieldErrors).flat()[0]
        : null;
      setError(fieldError || data.error || "Could not save creator.");
      setPending(false);
      return;
    }

    router.push(`/creators/${data.creator?.id ?? creatorId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Name</span>
          <input
            name="name"
            required
            defaultValue={values.name}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Photo URL</span>
          <input
            name="photoUrl"
            defaultValue={values.photoUrl}
            placeholder="https://"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Gender</span>
          <input
            name="gender"
            defaultValue={values.gender}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Age group</span>
          <input
            name="ageGroup"
            defaultValue={values.ageGroup}
            placeholder="18-24"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Location</span>
          <input
            name="location"
            defaultValue={values.location}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Availability</span>
          <select
            name="availability"
            defaultValue={normalizeCreatorAvailability(values.availability)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {CREATOR_AVAILABILITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CREATOR_AVAILABILITY_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={values.email}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Phone</span>
          <input
            name="phone"
            defaultValue={values.phone}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Rate</span>
          <input
            name="rate"
            type="number"
            min={0}
            step="1"
            defaultValue={values.rate}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex items-center gap-2 text-sm md:mt-7">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={values.isActive}
            className="size-4 accent-brand"
          />
          <span className="text-white/70">Active</span>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Languages</span>
        <textarea
          name="languages"
          rows={2}
          defaultValue={values.languages}
          placeholder="One per line"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Niches</span>
        <textarea
          name="niches"
          rows={2}
          defaultValue={values.niches}
          placeholder="One per line"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Demographics</span>
        <textarea
          name="demographics"
          rows={3}
          defaultValue={values.demographics}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Bank account name</span>
          <input
            name="bankAccountName"
            defaultValue={values.bankAccountName}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Bank account number</span>
          <input
            name="bankAccountNumber"
            defaultValue={values.bankAccountNumber}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">UPI ID</span>
          <input
            name="upiId"
            defaultValue={values.upiId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Portfolio links</span>
        <textarea
          name="portfolioLinks"
          rows={3}
          defaultValue={values.portfolioLinks}
          placeholder="One URL per line"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : isEdit ? "Save creator" : "Add creator"}
      </button>
    </form>
  );
}
