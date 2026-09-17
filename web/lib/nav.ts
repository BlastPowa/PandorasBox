import {
  Home,
  Compass,
  Library,
  CalendarDays,
  BarChart3,
  Settings,
  Search,
  Shield,
  Dices,
  FolderHeart,
  HelpCircle,
  Users,
  BookOpen,
  BookMarked,
  Gamepad2,
  Bell,
  MessageCircle,
  Globe2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavGroup = "main" | "personal" | "more";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  bottom?: boolean;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, group: "main", bottom: true },
  { href: "/browse", label: "Discover", icon: Compass, group: "main", bottom: true },
  { href: "/search", label: "Search", icon: Search, group: "main", bottom: true },
  { href: "/library", label: "Library", icon: Library, group: "main", bottom: true },
  { href: "/schedule", label: "Calendar", icon: CalendarDays, group: "main" },
  { href: "/collections", label: "Collections", icon: FolderHeart, group: "personal" },
  { href: "/stats", label: "Stats", icon: BarChart3, group: "personal" },
  { href: "/friends", label: "Community", icon: Users, group: "personal" },
  { href: "/messages", label: "Messages", icon: MessageCircle, group: "personal" },
  { href: "/notifications", label: "Notifications", icon: Bell, group: "personal" },
  { href: "/randomize", label: "Open the Box", icon: Dices, group: "more" },
  { href: "/gamers", label: "Games", icon: Gamepad2, group: "more" },
  { href: "/comics", label: "Comics", icon: BookOpen, group: "more" },
  { href: "/books", label: "Books", icon: BookMarked, group: "more" },
  { href: "/sites", label: "Providers", icon: Globe2, group: "more" },
  { href: "/updates", label: "What's New", icon: Sparkles, group: "more" },
  { href: "/settings", label: "Settings", icon: Settings, group: "more" },
  { href: "/faq", label: "Help", icon: HelpCircle, group: "more" },
  { href: "/admin", label: "Admin", icon: Shield, group: "more", adminOnly: true },
];

export const NAV_GROUPS: { key: NavGroup; label: string }[] = [
  { key: "main", label: "Explore" },
  { key: "personal", label: "Your space" },
  { key: "more", label: "More" },
];

export const BOTTOM_NAV = NAV_ITEMS.filter((item) => item.bottom).slice(0, 4);
