import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  ChefHat,
  Users,
  UtensilsCrossed,
  Layers,
  ShoppingCart,
  DollarSign,
  Ticket,
  Tag,
  MapPin,
  LogOut,
  KeyRound,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ChangePasswordDialog from "./change-password-dialog";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface NavSection {
  section: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    section: "Overview",
    items: [
      { to: "/admin-new/", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    section: "People",
    items: [
      { to: "/admin-new/chefs", icon: ChefHat, label: "Chefs" },
      { to: "/admin-new/customers", icon: Users, label: "Customers" },
    ],
  },
  {
    section: "Food",
    items: [
      { to: "/admin-new/menus", icon: UtensilsCrossed, label: "Menus" },
      { to: "/admin-new/categories", icon: Layers, label: "Categories" },
    ],
  },
  {
    section: "Orders",
    items: [
      { to: "/admin-new/orders", icon: ShoppingCart, label: "Orders" },
      { to: "/admin-new/earnings", icon: DollarSign, label: "Earnings" },
    ],
  },
  {
    section: "Support",
    items: [
      { to: "/admin-new/tickets", icon: Ticket, label: "Tickets" },
    ],
  },
  {
    section: "Marketing",
    items: [
      { to: "/admin-new/discount-codes", icon: Tag, label: "Discount Codes" },
    ],
  },
  {
    section: "Settings",
    items: [
      { to: "/admin-new/service-areas", icon: MapPin, label: "Service Areas" },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavClick = () => setMobileOpen(false);

  const sidebarContent = (
    <>
      <div className="border-b border-white/10 p-4">
        <h1 className="text-lg font-bold text-white">Taist Admin</h1>
        {user && (
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navSections.map((group, gi) => (
          <div key={group.section} className={gi > 0 ? "mt-4" : ""}>
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-gray-500">
              {group.section}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin-new/"}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/5"
          onClick={() => setPwDialogOpen(true)}
        >
          <KeyRound className="h-4 w-4" />
          Change Password
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-white/5"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <ChangePasswordDialog open={pwDialogOpen} onOpenChange={setPwDialogOpen} />
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-3 left-3 z-50 rounded-md bg-white p-2 shadow-md lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar (slides in) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gray-900 transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden h-screen w-64 flex-col bg-gray-900 lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
