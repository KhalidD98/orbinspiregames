import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex";
import {
  CreditCard,
  Calendar,
  Users,
  LayoutDashboard,
  LogOut,
  User,
  Menu,
  X,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/credit", label: "Store Credit", icon: CreditCard },
  { to: "/admin/events", label: "Events", icon: Calendar },
] as const;

const managerNavItems = [
  { to: "/admin/hours", label: "Store Hours", icon: Clock },
] as const;

const ownerNavItems = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/import", label: "CSV Import", icon: Upload },
] as const;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.current);
  const { signOut } = useAuthActions();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isOwner = user?.role === "owner";

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside
        className={`hidden flex-col border-r bg-card md:flex transition-all duration-200 ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className="flex h-14 items-center border-b px-4">
          {sidebarOpen && (
            <span className="flex-1 text-lg font-semibold">OrbinSpire Admin</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={sidebarOpen ? "" : "mx-auto"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/admin"
                ? location.pathname === "/admin" || location.pathname === "/admin/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={sidebarOpen ? undefined : item.label}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  sidebarOpen ? "gap-3" : "justify-center"
                } ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && item.label}
              </Link>
            );
          })}
          {(isOwner || user?.role === "manager") &&
            managerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={sidebarOpen ? undefined : item.label}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    sidebarOpen ? "gap-3" : "justify-center"
                  } ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && item.label}
                </Link>
              );
            })}
          {isOwner &&
            ownerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={sidebarOpen ? undefined : item.label}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    sidebarOpen ? "gap-3" : "justify-center"
                  } ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && item.label}
                </Link>
              );
            })}
        </nav>
        <div className="border-t p-3 space-y-1">
          <Link
            to="/admin/profile"
            title={sidebarOpen ? undefined : "Profile"}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground ${
              sidebarOpen ? "gap-3" : "justify-center"
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            {sidebarOpen && (user?.name || user?.email || "Profile")}
          </Link>
          <button
            onClick={() => signOut()}
            title={sidebarOpen ? undefined : "Sign out"}
            className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive ${
              sidebarOpen ? "gap-3" : "justify-center"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && "Sign out"}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b bg-card px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="ml-3 text-lg font-semibold">OrbinSpire</span>
        </header>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 md:hidden">
            <div className="fixed inset-y-0 left-0 w-64 border-r bg-card p-3">
              <div className="flex h-14 items-center justify-between px-1">
                <span className="text-lg font-semibold">OrbinSpire</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="mt-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                {(isOwner || user?.role === "manager") &&
                  managerNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                {isOwner &&
                  ownerNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
              </nav>
              <div className="mt-4 border-t pt-3 space-y-1">
                <Link
                  to="/admin/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
