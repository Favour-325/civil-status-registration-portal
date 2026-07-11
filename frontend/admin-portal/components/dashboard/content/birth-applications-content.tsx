"use client";

import { ApplicationsContent } from "./applications-content";

export function BirthApplicationsContent({ search }: { search?: string }) {
  return <ApplicationsContent type="birth" search={search} />;
}
