"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavBarProps {
  reorderCount: number;
}

const TABS = [
  { name: "Inventory", href: "/inventory", enabled: true },
  { name: "SOPs", href: "#", enabled: false },
  { name: "Team", href: "#", enabled: false },
  { name: "Reports", href: "#", enabled: false },
];

export default function NavBar({ reorderCount }: NavBarProps) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <span className="text-xl font-bold text-bicr-navy">BICR Ops</span>
            <div className="flex space-x-1">
              {TABS.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.name}
                    href={tab.enabled ? tab.href : "#"}
                    className={`
                      relative px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${isActive ? "bg-bicr-teal text-white"
                        : tab.enabled ? "text-bicr-charcoal hover:bg-gray-100"
                        : "text-gray-300 cursor-not-allowed"}
                    `}
                    aria-disabled={!tab.enabled}
                  >
                    {tab.name}
                    {tab.name === "Inventory" && reorderCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                        {reorderCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-bicr-charcoal transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
