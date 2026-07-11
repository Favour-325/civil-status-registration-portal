"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, Heart, FileText } from "lucide-react";
import { listApplications, ApiError } from "@/lib/api";
import type { ApplicationRecord, ApplicationStatus } from "@/lib/types";

const cardShadow =
  "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px";

const STATUS_ORDER: ApplicationStatus[] = ["PENDING", "ACCEPTED", "REJECTED"];

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  PENDING: "text-warning",
  ACCEPTED: "text-success",
  REJECTED: "text-destructive",
};

export function OverviewContent() {
  const router = useRouter();
  const [birth, setBirth] = useState<ApplicationRecord[]>([]);
  const [marriage, setMarriage] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [b, m] = await Promise.all([
          listApplications("birth"),
          listApplications("marriage"),
        ]);
        if (cancelled) return;
        setBirth(b);
        setMarriage(m);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.isAuthError) {
          router.push("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load applications.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const all = [...birth, ...marriage];

  const metrics = [
    { label: "Total Applications", value: all.length, icon: FileText, color: "text-chart-1", bgColor: "bg-chart-1/10" },
    { label: "Birth Applications", value: birth.length, icon: Baby, color: "text-chart-2", bgColor: "bg-chart-2/10" },
    { label: "Marriage Applications", value: marriage.length, icon: Heart, color: "text-destructive", bgColor: "bg-destructive/10" },
  ];

  const countByStatus = (status: ApplicationStatus) =>
    all.filter((a) => a.status === status).length;

  if (loading) {
    return <p className="text-muted-foreground">Loading overview...</p>;
  }

  if (error) {
    return (
      <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="bg-card rounded-2xl p-5 border border-border"
              style={{ boxShadow: cardShadow }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${metric.bgColor}`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
              </div>
              <p className="text-2xl font-semibold text-foreground mb-1">
                {metric.value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </div>
          );
        })}
      </div>

      {/* Status Breakdown */}
      <div
        className="bg-card rounded-2xl p-6 border border-border"
        style={{ boxShadow: cardShadow }}
      >
        <div className="mb-6">
          <h3 className="text-base font-semibold text-foreground">Status Breakdown</h3>
          <p className="text-sm text-muted-foreground">
            Across all birth and marriage applications
          </p>
        </div>

        {all.length === 0 ? (
          <p className="text-muted-foreground">No applications have been submitted yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {STATUS_ORDER.map((status) => {
              const count = countByStatus(status);
              const pct = Math.round((count / all.length) * 100);
              return (
                <div key={status}>
                  <p className={`text-2xl font-semibold ${STATUS_STYLES[status]}`}>{count}</p>
                  <p className="text-sm text-muted-foreground">
                    {status} ({pct}%)
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
