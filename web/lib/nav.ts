import {
  Home,
  Compass,
  Library,
  CalendarDays,
  BarChart3,
  Settings,
  Search,
  Shield,
  Globe,
  Dices,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** show in the mobile bottom bar (max 5) */
  bottom?: boolean;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, bottom: true },
  { href: "/browse", label: "Browse", icon: Compass, bottom: true },
  { href: "/randomize", label: "Randomize", icon: Dices, bottom: true },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "My Library", icon: Library, bottom: true },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/sites", label: "Sites", icon: Globe },
  { href: "/stats", label: "Stats", icon: BarChart3, bottom: true },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export const BOTTOM_NAV = NAV_ITEMS.filter((i) => i.bottom).slice(0, 5);
