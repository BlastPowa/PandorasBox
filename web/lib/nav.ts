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
  FolderHeart,
  HelpCircle,
  Trophy,
  Star,
  Users,
  BookOpen,
  Tv,
  Clapperboard,
  MonitorPlay,
  Gamepad2,
  Film,
  type LucideIcon,
} from "lucide-react";

export type NavGroup = "main" | "personal" | "more";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  /** show in the mobile bottom bar's primary 4 slots (5th slot is always "More") */
  bottom?: boolean;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home, group: "main", bottom: true },
  { href: "/browse", label: "Browse", icon: Compass, group: "main", bottom: true },
  { href: "/movies", label: "Movies", icon: Clapperboard, group: "main" },
  { href: "/tv", label: "Shows", icon: MonitorPlay, group: "main" },
  { href: "/anime", label: "Anime", icon: Tv, group: "main" },
  { href: "/shorts", label: "Shorts", icon: Film, group: "main" },
  { href: "/randomize", label: "Randomize", icon: Dices, group: "main", bottom: true },
  { href: "/search", label: "Search", icon: Search, group: "main" },
  { href: "/schedule", label: "Schedule", icon: CalendarDays, group: "main" },
  { href: "/library", label: "My Library", icon: Library, group: "personal", bottom: true },
  { href: "/collections", label: "Collections", icon: FolderHeart, group: "personal" },
  { href: "/rankings", label: "My Rankings", icon: Trophy, group: "personal" },
  { href: "/episode-ratings", label: "Episode Ratings", icon: Star, group: "personal" },
  { href: "/friends", label: "Friends", icon: Users, group: "personal" },
  { href: "/stats", label: "Stats", icon: BarChart3, group: "personal" },
  { href: "/gamers", label: "Games", icon: Gamepad2, group: "more" },
  { href: "/comics", label: "Comics", icon: BookOpen, group: "more" },
  { href: "/sites", label: "Sites", icon: Globe, group: "more" },
  { href: "/settings", label: "Settings", icon: Settings, group: "more" },
  { href: "/faq", label: "FAQ & Help", icon: HelpCircle, group: "more" },
  { href: "/admin", label: "Admin", icon: Shield, group: "more", adminOnly: true },
];

export const NAV_GROUPS: { key: NavGroup; label: string }[] = [
  { key: "main", label: "Main" },
  { key: "personal", label: "Personal" },
  { key: "more", label: "More" },
];

/** The 4 primary mobile bottom-bar destinations — the 5th slot is always a
 * static "More" trigger (not a nav destination) opening the full list. */
export const BOTTOM_NAV = NAV_ITEMS.filter((i) => i.bottom).slice(0, 4);
