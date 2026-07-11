"use client";

import { ApplicationsContent } from "./applications-content";

export function MarriageApplicationsContent({ search }: { search?: string }) {
  return <ApplicationsContent type="marriage" search={search} />;
}
