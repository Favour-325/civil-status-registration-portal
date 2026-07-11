"use client";

import { useEffect, useRef, useState } from "react";
import type { Section } from "@/app/page";
import { getOfficerIdentity } from "@/lib/api";
import { OverviewContent } from "./content/overview-content";
import { BirthApplicationsContent } from "./content/birth-applications-content";
import { MarriageApplicationsContent } from "./content/marriage-applications-content";
import { Search } from "lucide-react";

interface MainContentProps {
  activeSection: Section;
}

const sectionConfig: Record<Section, { title: string; subtitle: string }> = {
  overview: {
    title: "Dashboard",
    subtitle: "Civil Status Applications Overview",
  },
  birth: {
    title: "Birth Applications",
    subtitle: "Manage birth registration applications",
  },
  marriage: {
    title: "Marriage Applications",
    subtitle: "Manage marriage registration applications",
  },
};

const cardShadow = "0px 1px 3px rgba(0, 0, 0, 0.08)";

export function MainContent({ activeSection }: MainContentProps) {
  const config = sectionConfig[activeSection];
  const [officerName, setOfficerName] = useState("");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // The list sections search by name; the overview has no list to filter.
  const searchable = activeSection === "birth" || activeSection === "marriage";

  // Reset the query when moving between sections so a stale filter doesn't hide
  // the section you just opened.
  useEffect(() => {
    setSearch("");
  }, [activeSection]);

  // "/" focuses the search box, matching the on-screen hint — but not while
  // typing in an input, or the key would be swallowed.
  useEffect(() => {
    if (!searchable) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchable]);

  useEffect(() => {
    let cancelled = false;
    getOfficerIdentity()
      .then(({ name }) => {
        if (!cancelled) setOfficerName(name);
      })
      // AuthGuard already gates this component on a valid session, so a failure
      // here just means we render the header without a greeting.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewContent />;
      case "birth":
        return <BirthApplicationsContent search={search} />;
      case "marriage":
        return <MarriageApplicationsContent search={search} />;
      default:
        return <OverviewContent />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-border bg-card shrink-0">
        <h1 className="text-lg font-semibold text-foreground tracking-tight pl-2 pt-1.5">
          {config.title}
        </h1>

        <div className="flex items-center gap-4">
          {officerName && (
            <p className="text-sm text-muted-foreground">
              Welcome, <span className="font-medium text-foreground">{officerName}</span>
            </p>
          )}

          {searchable && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/60 focus-within:bg-muted transition-colors w-64">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              ) : (
                <kbd className="text-[11px] text-muted-foreground bg-background px-1.5 py-0.5 rounded-md border border-border font-mono">
                  /
                </kbd>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div key={activeSection} className="animate-fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
