"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  VIDEO_STATUSES,
  VIDEO_STATUS_LABELS,
  normalizeVideoStatus,
} from "@/lib/status";

export type VideoFormValues = {
  clientId: string;
  orderId: string;
  scriptId: string;
  creatorId: string;
  shootId: string;
  assignedEditorId: string;
  deadline: string;
  fileLink: string;
  thumbnailUrl: string;
  finalDeliveryLink: string;
  status: string;
};

type ClientOption = { id: string; name: string; companyName: string };
type OrderOption = { id: string; packageName: string };
type ScriptOption = { id: string; videoNumber: number; language: string; status: string };
type CreatorOption = { id: string; name: string };
type ShootOption = { id: string; location: string; scheduledAt: string | null };
type EmployeeOption = { id: string; name: string; jobTitle: string };

const EMPTY: VideoFormValues = {
  clientId: "",
  orderId: "",
  scriptId: "",
  creatorId: "",
  shootId: "",
  assignedEditorId: "",
  deadline: "",
  fileLink: "",
  thumbnailUrl: "",
  finalDeliveryLink: "",
  status: "Script Approved",
};

export function VideoForm({
  initialValues,
  videoId,
}: {
  initialValues?: Partial<VideoFormValues>;
  videoId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [scripts, setScripts] = useState<ScriptOption[]>([]);
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [shoots, setShoots] = useState<ShootOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [clientId, setClientId] = useState(initialValues?.clientId ?? EMPTY.clientId);
  const values = { ...EMPTY, ...initialValues };
  const isEdit = Boolean(videoId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [clientRes, creatorRes, employeeRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/creators"),
        fetch("/api/employees"),
      ]);
      if (clientRes.ok) {
        const data = (await clientRes.json()) as { clients?: ClientOption[] };
        if (!cancelled) setClients(data.clients ?? []);
      }
      if (creatorRes.ok) {
        const data = (await creatorRes.json()) as { creators?: CreatorOption[] };
        if (!cancelled) setCreators(data.creators ?? []);
      }
      if (employeeRes.ok) {
        const data = (await employeeRes.json()) as { employees?: EmployeeOption[] };
        if (!cancelled) setEmployees(data.employees ?? []);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadClientRecords() {
      if (!clientId) {
        setOrders([]);
        setScripts([]);
        setShoots([]);
        return;
      }
      const [orderRes, scriptRes, shootRes] = await Promise.all([
        fetch(`/api/orders?clientId=${clientId}`),
        fetch(`/api/scripts?clientId=${clientId}`),
        fetch(`/api/shoots?clientId=${clientId}`),
      ]);
      if (orderRes.ok) {
        const data = (await orderRes.json()) as { orders?: OrderOption[] };
        if (!cancelled) setOrders(data.orders ?? []);
      }
      if (scriptRes.ok) {
        const data = (await scriptRes.json()) as { scripts?: ScriptOption[] };
        if (!cancelled) setScripts(data.scripts ?? []);
      }
      if (shootRes.ok) {
        const data = (await shootRes.json()) as { shoots?: ShootOption[] };
        if (!cancelled) setShoots(data.shoots ?? []);
      }
    }
    void loadClientRecords();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      clientId: String(formData.get("clientId") ?? values.clientId),
      orderId: String(formData.get("orderId") ?? values.orderId),
      scriptId: String(formData.get("scriptId") ?? "") || null,
      creatorId: String(formData.get("creatorId") ?? "") || null,
      shootId: String(formData.get("shootId") ?? "") || null,
      assignedEditorId: String(formData.get("assignedEditorId") ?? "") || null,
      deadline: String(formData.get("deadline") ?? "") || null,
      fileLink: String(formData.get("fileLink") ?? ""),
      thumbnailUrl: String(formData.get("thumbnailUrl") ?? ""),
      finalDeliveryLink: String(formData.get("finalDeliveryLink") ?? ""),
      status: String(formData.get("status") ?? "Script Approved"),
    };

    const response = await fetch(isEdit ? `/api/videos/${videoId}` : "/api/videos", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
      video?: { id: string };
    };
    if (!response.ok) {
      const fieldError = data.details?.fieldErrors
        ? Object.values(data.details.fieldErrors).flat()[0]
        : null;
      setError(fieldError || data.error || "Could not save video.");
      setPending(false);
      return;
    }
    router.push(`/videos/${data.video?.id ?? videoId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Client</span>
          <select
            name="clientId"
            required
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName || client.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Order</span>
          <select
            name="orderId"
            required
            defaultValue={values.orderId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Select order</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.packageName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Script</span>
          <select
            name="scriptId"
            defaultValue={values.scriptId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {scripts.map((script) => (
              <option key={script.id} value={script.id}>
                Video {script.videoNumber}
                {script.language ? ` · ${script.language}` : ""} · {script.status}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Creator</span>
          <select
            name="creatorId"
            defaultValue={values.creatorId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Shoot</span>
          <select
            name="shootId"
            defaultValue={values.shootId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {shoots.map((shoot) => (
              <option key={shoot.id} value={shoot.id}>
                {shoot.location || "Shoot"}
                {shoot.scheduledAt ? ` · ${shoot.scheduledAt.slice(0, 10)}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Assigned editor</span>
          <select
            name="assignedEditorId"
            defaultValue={values.assignedEditorId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name || employee.jobTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Deadline</span>
          <input
            name="deadline"
            type="datetime-local"
            defaultValue={values.deadline}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={normalizeVideoStatus(values.status)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {VIDEO_STATUSES.map((status) => (
              <option key={status} value={status}>
                {VIDEO_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm md:col-span-2">
          <span className="text-white/50">Video file / Drive link</span>
          <input
            name="fileLink"
            defaultValue={values.fileLink}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Thumbnail</span>
          <input
            name="thumbnailUrl"
            defaultValue={values.thumbnailUrl}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Final delivery link</span>
          <input
            name="finalDeliveryLink"
            defaultValue={values.finalDeliveryLink}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : isEdit ? "Save video" : "Create video"}
      </button>
    </form>
  );
}
