"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PAYOUT_STATUSES, PAYOUT_STATUS_LABELS } from "@/lib/status";

type CreatorOption = { id: string; name: string; rate: number };
type OrderOption = { id: string; packageName: string };
type VideoOption = { id: string; packageName: string; orderId: string | null };

export function PayoutForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [creatorId, setCreatorId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [videoCount, setVideoCount] = useState(1);
  const [contractedRate, setContractedRate] = useState(0);

  const totalPayout = useMemo(
    () => Number(videoCount) * Number(contractedRate),
    [videoCount, contractedRate],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [creatorRes, orderRes, videoRes] = await Promise.all([
        fetch("/api/creators"),
        fetch("/api/orders"),
        fetch("/api/videos"),
      ]);
      if (creatorRes.ok) {
        const data = (await creatorRes.json()) as { creators?: CreatorOption[] };
        if (!cancelled) {
          setCreators(data.creators ?? []);
        }
      }
      if (orderRes.ok) {
        const data = (await orderRes.json()) as { orders?: OrderOption[] };
        if (!cancelled) {
          setOrders(data.orders ?? []);
        }
      }
      if (videoRes.ok) {
        const data = (await videoRes.json()) as { videos?: VideoOption[] };
        if (!cancelled) {
          setVideos(data.videos ?? []);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredVideos = videos.filter((video) => !orderId || video.orderId === orderId);

  function onCreatorChange(id: string) {
    setCreatorId(id);
    const creator = creators.find((item) => item.id === id);
    if (creator) {
      setContractedRate(Number(creator.rate ?? 0));
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId,
        orderId: orderId || null,
        videoId: String(form.get("videoId") ?? ""),
        videoCount,
        contractedRate,
        totalPayout,
        paymentDate: String(form.get("paymentDate") ?? "") || null,
        reference: String(form.get("reference") ?? ""),
        status: String(form.get("status") ?? "Pending"),
      }),
    });
    const data = (await response.json()) as { error?: string; payout?: { id: string } };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not save payout.");
      return;
    }
    router.push(data.payout?.id ? `/payouts/${data.payout.id}` : "/payouts");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Creator</span>
        <select
          required
          value={creatorId}
          onChange={(event) => onCreatorChange(event.target.value)}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          <option value="">Select creator</option>
          {creators.map((creator) => (
            <option key={creator.id} value={creator.id}>
              {creator.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Order</span>
        <select
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          <option value="">No linked package</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.packageName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Video</span>
        <select
          name="videoId"
          required
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          <option value="">Select video</option>
          {filteredVideos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.packageName || video.id}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Video count</span>
          <input
            type="number"
            min={1}
            value={videoCount}
            onChange={(event) => setVideoCount(Number(event.target.value))}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Contracted rate</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={contractedRate}
            onChange={(event) => setContractedRate(Number(event.target.value))}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Total payout</span>
          <input
            readOnly
            value={totalPayout}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white/80"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Payment date</span>
          <input
            type="date"
            name="paymentDate"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue="Pending"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {PAYOUT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYOUT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Reference</span>
        <input
          name="reference"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : "Create payout"}
      </button>
    </form>
  );
}
