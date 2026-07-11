"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { MainContent } from "@/components/dashboard/main-content";
import { RightPanel } from "@/components/dashboard/right-panel";
import { AuthGuard } from "@/components/auth-guard";

export type Section =
  | "overview"
  | "birth"
  | "marriage";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<Section>("overview");

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Left Sidebar */}
        <AppSidebar 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
        
        {/* Main Content */}
        <MainContent activeSection={activeSection} />
      </div>
    </AuthGuard>
  );
}
