"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { rejectionReasons } from "@/lib/data";

interface RejectionModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectionModal({
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: RejectionModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
      setSelectedReason("");
    }
  };

  const handleCancel = () => {
    setSelectedReason("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Reject Application
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Please select a reason for rejecting this application.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block">
            Rejection Reason
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a reason...</option>
            {rejectionReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            onClick={handleCancel}
            disabled={isLoading}
            variant="outline"
            className="bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedReason || isLoading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isLoading ? "Processing..." : "Reject"}
          </Button>
        </div>
      </div>
    </div>
  );
}
