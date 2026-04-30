"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/characters", label: "Characters", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[#e0e0d9] bg-[#f6f6f3] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#e0e0d9]">
        <span className="font-bold text-lg tracking-tight text-[#211922]">
          mo<span className="text-[#e60023]">tube</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[#e60023]/10 text-[#e60023]"
                  : "text-[#62625b] hover:bg-[#e5e5e0] hover:text-[#211922]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#e0e0d9]">
        <p className="text-xs text-[#91918c]">motube v0.1</p>
      </div>
    </aside>
  );
}
