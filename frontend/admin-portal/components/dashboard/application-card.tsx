"use client";

import { Button } from "@/components/ui/button";
import type { ApplicationStatus, ApplicationSummary } from "@/lib/types";

interface ApplicationCardProps {
  application: ApplicationSummary;
  onReview: () => void;
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  PENDING: "bg-warning/10 text-warning",
  ACCEPTED: "bg-success/10 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
};

const formatDate = (value?: string) =>
  value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString() : "—";

export function ApplicationCard({ application, onReview }: ApplicationCardProps) {
  const isBirth = application.type === "birth";

  return (
    <div className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground line-clamp-2">
              {application.subjectName}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              ID: {application.applicationId}
            </p>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              STATUS_STYLES[application.status]
            }`}
          >
            {application.status}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {isBirth ? "Date of Birth:" : "Date of Marriage:"}
            </span>
            <span className="text-foreground font-medium">
              {formatDate(application.subjectDate)}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">
              {isBirth ? "Place of Birth:" : "Place of Marriage:"}
            </span>
            <span className="text-foreground font-medium text-right line-clamp-2">
              {application.subjectPlace || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Submitted:</span>
            <span className="text-foreground font-medium">
              {formatDate(application.submittedDate)}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={onReview}
          className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Review
        </Button>
      </div>
    </div>
  );
}
