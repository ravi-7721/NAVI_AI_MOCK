"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  FileQuestion,
  FileText,
  Headphones,
  History,
  Home,
  LayoutDashboard,
  Settings,
  Sparkles,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type RootNavbarProps = {
  logoutAction: () => Promise<void>;
};

const allLinks: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/logic-arena", label: "Logic Arena", icon: Sparkles },
  { href: "/interview", label: "Interview", icon: BriefcaseBusiness },
  // { href: "/interview-history", label: "History", icon: History },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/resume-lab", label: "Resume Lab", icon: FileText },
  { href: "/questions", label: "Questions", icon: FileQuestion },
  { href: "/about", label: "About", icon: Users },
  // { href: "/contact-support", label: "Support", icon: Headphones },
  // { href: "/faq", label: "FAQ", icon: CircleHelp },
  // { href: "/settings", label: "Settings", icon: Settings },
];

const primaryLinkHrefs = new Set([
  "/",
  "/dashboard",
  "/logic-arena",
  "/interview",
  "/interview-history",
  "/leaderboard",
  "/profile"
]);

const primaryLinks = allLinks.filter((item) => primaryLinkHrefs.has(item.href));
const secondaryLinks = allLinks.filter((item) => !primaryLinkHrefs.has(item.href));

const isActiveLink = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

const RootNavbar = ({ logoutAction }: RootNavbarProps) => {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isMoreOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMoreOpen]);

  return (
    <div className="header-shell">
      <div className="header-nav">
        <div className="header-nav__links">
          {primaryLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`header-link ${
                  isActiveLink(pathname, item.href) ? "header-link--active" : ""
                }`}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="header-more" ref={moreRef}>
            <button
              type="button"
              className={`header-link header-more__trigger ${
                secondaryLinks.some((item) => isActiveLink(pathname, item.href))
                  ? "header-link--active"
                  : ""
              }`}
              aria-expanded={isMoreOpen}
              aria-haspopup="menu"
              onClick={() => setIsMoreOpen((value) => !value)}
            >
              <span>More</span>
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${
                  isMoreOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isMoreOpen ? (
              <div className="header-more__menu" role="menu">
                {secondaryLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className={`header-more__item ${
                        isActiveLink(pathname, item.href)
                          ? "header-more__item--active"
                          : ""
                      }`}
                      role="menuitem"
                      onClick={() => setIsMoreOpen(false)}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="header-nav__actions">
          <form action={logoutAction}>
            <Button type="submit" className="header-logout">
              Logout
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RootNavbar;
