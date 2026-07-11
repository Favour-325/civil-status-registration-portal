"use client";

import { Button } from "@/components/ui/button";

interface ApprovalModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApprovalModal({
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
}: ApprovalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Approve Application?
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Are you sure you want to approve this application? This action cannot
            be undone.
          </p>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            disabled={isLoading}
            variant="outline"
            className="bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {isLoading ? "Processing..." : "Approve"}
          </Button>
        </div>
      </div>
    </div>
  );
}
