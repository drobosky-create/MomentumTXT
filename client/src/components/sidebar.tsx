import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3,
  Gauge,
  Sliders,
  Users,
  UserCheck,
  History,
  Plug,
  CreditCard,
  Settings,
  ChevronUp,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Gauge },
  { name: "Configure KPIs", href: "/kpis", icon: Sliders },
  { name: "SMS Recipients", href: "/sms-recipients", icon: Users },
  { name: "Team Management", href: "/team", icon: UserCheck },
  { name: "SMS History", href: "/history", icon: History },
];

const secondaryNavigation = [
  { name: "Integrations", href: "/integrations", icon: Plug },
  { name: "Billing & Plans", href: "/billing", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-card border-r border-border">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo/Brand */}
        <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground" data-testid="text-app-name">
                KPIFlow
              </h1>
              <p className="text-xs text-muted-foreground" data-testid="text-company-name">
                KPIFlow
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-border">
            {secondaryNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/[\s&]+/g, "-")}`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-3">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  {user?.firstName?.[0] || user?.email?.[0] || "U"}
                </span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
                {user?.firstName || user?.email || "User"}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-user-role">
                {user?.role || "Admin"}
              </p>
            </div>
            <button
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowUserMenu(!showUserMenu)}
              data-testid="button-user-menu"
            >
              <ChevronUp
                className={cn("h-4 w-4 transition-transform", showUserMenu && "rotate-180")}
              />
            </button>
          </div>

          {showUserMenu && (
            <div className="mt-2 py-2 bg-popover border border-border rounded-md shadow-lg">
              <button
                className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50"
                onClick={() => (window.location.href = "/api/logout")}
                data-testid="button-logout"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
