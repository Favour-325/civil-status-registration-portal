"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ApplicationCard } from "../application-card";
import { ApplicationDetailView } from "../application-detail-view";
import { Button } from "@/components/ui/button";
import { listApplications, ApiError } from "@/lib/api";
import { toSummary, type ApplicationSummary, type ApplicationType } from "@/lib/types";

type SortOrder = "newest" | "oldest";

/**
 * Shared list view for both application types. Birth and marriage differ only in
 * which endpoint they read and how their fields are labelled, and `toSummary`
 * already absorbs the latter.
 */
export function ApplicationsContent({ type, search = "" }: { type: ApplicationType; search?: string }) {
  const router = useRouter();
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [selected, setSelected] = useState<ApplicationSummary | null>(null);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const records = await listApplications(type);
      setApplications(records.map(toSummary));
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        router.push("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }, [type, router]);

  useEffect(() => {
    load();
  }, [load]);

  const sortedApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? applications.filter((a) => a.subjectName.toLowerCase().includes(query))
      : applications;
    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.submittedDate).getTime();
      const dateB = new Date(b.submittedDate).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [applications, sortOrder, search]);

  if (selected) {
    return (
      <ApplicationDetailView
        application={selected}
        onBack={() => setSelected(null)}
        onActioned={() => {
          setSelected(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Sort by:</span>
        <div className="flex gap-2">
          <Button
            onClick={() => setSortOrder("newest")}
            variant={sortOrder === "newest" ? "default" : "outline"}
            className={
              sortOrder === "newest"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent border-border"
            }
          >
            Newest
          </Button>
          <Button
            onClick={() => setSortOrder("oldest")}
            variant={sortOrder === "oldest" ? "default" : "outline"}
            className={
              sortOrder === "oldest"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent border-border"
            }
          >
            Oldest
          </Button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading applications...</p>}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          <Button onClick={load} variant="outline" className="mt-3 bg-transparent">
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && sortedApplications.length === 0 && (
        <p className="text-muted-foreground">
          {search.trim()
            ? `No ${type} applications match “${search.trim()}”.`
            : `No ${type} applications have been submitted yet.`}
        </p>
      )}

      {!loading && !error && sortedApplications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedApplications.map((app) => (
            <ApplicationCard
              key={app.applicationId}
              application={app}
              onReview={() => setSelected(app)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
