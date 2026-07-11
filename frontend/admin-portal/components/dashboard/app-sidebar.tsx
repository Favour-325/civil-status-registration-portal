"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "aws-amplify/auth";
import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import {
  LayoutDashboard,
  Baby,
  Heart,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AppSidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

interface NavItem {
  id: Section;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: "red" | "yellow" | "green";
}

const mainMenu: NavItem[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
];

const applicationMenu: NavItem[] = [
  { id: "birth", label: "Birth", icon: Baby },
  { id: "marriage", label: "Marriage", icon: Heart },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // The pool uses the hosted UI, so this redirects through Cognito's /logout
      // and back to the stack's configured logout URL. It normally does not
      // return; if it does, the redirect was blocked and we route ourselves.
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
      setSigningOut(false);
    }
  };

  return (
    <aside className="w-[260px] h-screen bg-card border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-border">
        <span className="font-semibold text-foreground text-[18px] tracking-tight">
          CCSP
        </span>
      </div>

      {/* Main Menu */}
      <div className="px-4 py-3">
        <nav className="space-y-0.5">
          {mainMenu.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
            />
          ))}
        </nav>
      </div>

      {/* Applications Section */}
      <div className="px-4 flex-1">
        <p className="px-2 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Applications
        </p>
        <nav className="space-y-0.5">
          {applicationMenu.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
            />
          ))}
        </nav>
      </div>

      <div className="px-4 pb-4 mt-2 border-t border-border">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground/80 transition-all duration-200 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span className="flex-1 text-left">{signingOut ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

function NavButton({ item, isActive, onClick }: NavButtonProps) {
  const Icon = item.icon;
  
  const badgeColorClass = {
    red: "bg-destructive/15 text-destructive",
    yellow: "bg-warning/20 text-warning",
    green: "bg-success/15 text-success",
  };
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "text-foreground/80 hover:bg-muted/80 hover:text-foreground"
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge && (
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isActive
              ? "bg-primary-foreground/20 text-primary-foreground"
              : item.badgeColor 
                ? badgeColorClass[item.badgeColor]
                : "bg-muted text-muted-foreground"
          )}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}
