import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Shield, Rss, Settings, TrendingUp, Search, Layers } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";

const MAIN_NAV = [
  { label: "Intelligence Feed", icon: Rss, to: "/feed", description: "AI-enriched articles" },
  { label: "Search & Filter", icon: Search, to: "/search", description: "Find threats fast" },
  { label: "Unified Events", icon: Layers, to: "/unified", description: "Deduplicated events" },
];

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}

function Sidebar() {
  const user = useQuery(api.users.getCurrentUser, {});
  const location = useLocation();
  const isTrends = location.pathname === "/";

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-bold text-sidebar-foreground leading-none tracking-tight">ThreatHub</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase tracking-widest">AI Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
        {/* Dashboard home */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">Dashboard</p>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="truncate">Trend Dashboard</div>
              {!isTrends && <div className="text-[10px] text-muted-foreground group-hover:text-inherit truncate">Global intelligence view</div>}
            </div>
          </NavLink>
        </div>

        {/* 3 core features */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">Core Features</p>
          <div className="space-y-1">
            {MAIN_NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{item.label}</div>
                  <div className="text-[10px] text-muted-foreground group-hover:text-inherit truncate">{item.description}</div>
                </div>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Admin — only shown if user is admin */}
        {user?.role === "admin" && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 mb-2">Settings</p>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )
              }
            >
              <Settings className="w-4 h-4 shrink-0" />
              Admin Panel
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="flex items-center px-4 py-3 border-b border-border bg-card/50 md:hidden">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sm tracking-tight">ThreatHub</span>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const allNav = [
    { label: "Trends", icon: TrendingUp, to: "/", end: true },
    ...MAIN_NAV.map(n => ({ ...n, end: false })),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-border bg-background/95 backdrop-blur md:hidden z-50">
      {allNav.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors cursor-pointer min-w-0",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="truncate max-w-[56px] text-center leading-tight">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
