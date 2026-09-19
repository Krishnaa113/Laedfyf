import type { ProductionCounter } from "@/lib/orders/production";

const STEPS: { key: keyof ProductionCounter; label: string }[] = [
  { key: "ordered", label: "Ordered" },
  { key: "assigned", label: "Assigned" },
  { key: "completed", label: "Completed" },
  { key: "delivered", label: "Delivered" },
  { key: "remaining", label: "Remaining" },
];

export function ProductionCounter({
  production,
  contractedVideoCount,
}: {
  production: ProductionCounter;
  contractedVideoCount: number;
}) {
  return (
    <section className="rounded-lg border border-white/10 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Production counter</h2>
          <p className="mt-1 text-sm text-white/50">
            Live from Video aggregation · contracted {contractedVideoCount}
          </p>
        </div>
      </div>
      <ol className="mt-5 grid gap-3 md:grid-cols-5">
        {STEPS.map((step, index) => (
          <li
            key={step.key}
            className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-3"
          >
            <p className="text-xs uppercase tracking-wide text-white/40">
              {index + 1}. {step.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-brand">
              {production[step.key]}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
