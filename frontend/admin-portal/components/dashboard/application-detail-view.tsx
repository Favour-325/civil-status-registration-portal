"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ApprovalModal } from "./modals/approval-modal";
import { RejectionModal } from "./modals/rejection-modal";
import { updateApplication, getDocumentUrl, ApiError } from "@/lib/api";
import { FIELD_LABELS, type ApplicationStatus, type ApplicationSummary } from "@/lib/types";

interface ApplicationDetailViewProps {
  application: ApplicationSummary;
  onBack: () => void;
  /** Called after the status change has been persisted. */
  onActioned: () => void;
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  PENDING: "bg-warning/10 text-warning",
  ACCEPTED: "bg-success/10 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
};

export function ApplicationDetailView({
  application,
  onBack,
  onActioned,
}: ApplicationDetailViewProps) {
  const router = useRouter();
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [documentLoading, setDocumentLoading] = useState(false);

  const loadDocument = async () => {
    if (!application.documentKey) return;
    setDocumentLoading(true);
    setError("");
    try {
      setDocumentUrl(await getDocumentUrl(application.documentKey));
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        router.push("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load the document.");
    } finally {
      setDocumentLoading(false);
    }
  };

  const submit = async (status: "ACCEPTED" | "REJECTED", reason?: string) => {
    setIsProcessing(true);
    setError("");
    try {
      await updateApplication(application.type, {
        citizenId: application.citizenId,
        applicationId: application.applicationId,
        status,
        ...(reason ? { reason } : {}),
      });
      setShowApprovalModal(false);
      setShowRejectionModal(false);
      onActioned();
    } catch (err) {
      if (err instanceof ApiError && err.isAuthError) {
        router.push("/login");
        return;
      }
      setShowApprovalModal(false);
      setShowRejectionModal(false);
      setError(err instanceof Error ? err.message : "Could not update the application.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isDecided = application.status !== "PENDING";
  const fields = Object.entries(application.data ?? {}).filter(([, v]) => v);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-2xl font-semibold text-foreground">Application Details</h1>
      </div>

      {/* Summary Card */}
      <div className="bg-card rounded-2xl border border-border p-8 space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Application ID</p>
              <p className="text-lg font-semibold text-foreground break-all">
                {application.applicationId}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {application.type === "birth" ? "Child" : "Spouses"}
              </p>
              <p className="text-lg font-semibold text-foreground">{application.subjectName}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Submitted by</p>
              <p className="text-lg font-semibold text-foreground break-all">
                {application.citizenId}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  STATUS_STYLES[application.status]
                }`}
              >
                {application.status}
              </span>
              {application.reason && (
                <p className="text-sm text-muted-foreground mt-2">
                  Reason: {application.reason}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Supporting document */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Supporting document</h2>
          {!application.documentKey ? (
            <p className="text-sm text-muted-foreground">
              No document was attached to this application.
            </p>
          ) : documentUrl ? (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline"
            >
              Open document (link expires in 5 minutes)
            </a>
          ) : (
            <Button
              onClick={loadDocument}
              disabled={documentLoading}
              variant="outline"
              className="bg-transparent"
            >
              {documentLoading ? "Preparing link..." : "View document"}
            </Button>
          )}
        </div>

        {/* Everything the citizen submitted */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Submitted information</h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
            {fields.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4 border-b border-border pb-2">
                <dt className="text-sm text-muted-foreground">{FIELD_LABELS[key] ?? key}</dt>
                <dd className="text-sm font-medium text-foreground text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Action Buttons */}
      {isDecided ? (
        <p className="text-sm text-muted-foreground text-right">
          This application has already been {application.status.toLowerCase()}.
        </p>
      ) : (
        <div className="flex gap-3 justify-end">
          <Button
            onClick={() => setShowRejectionModal(true)}
            disabled={isProcessing}
            variant="outline"
            className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
          >
            Reject
          </Button>
          <Button
            onClick={() => setShowApprovalModal(true)}
            disabled={isProcessing}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            Approve
          </Button>
        </div>
      )}

      {/* Modals */}
      <ApprovalModal
        isOpen={showApprovalModal}
        isLoading={isProcessing}
        onConfirm={() => submit("ACCEPTED")}
        onCancel={() => setShowApprovalModal(false)}
      />
      <RejectionModal
        isOpen={showRejectionModal}
        isLoading={isProcessing}
        onConfirm={(reason) => submit("REJECTED", reason)}
        onCancel={() => setShowRejectionModal(false)}
      />
    </div>
  );
}
