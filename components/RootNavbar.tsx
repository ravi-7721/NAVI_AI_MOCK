"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavLink = {
  href: string;
  label: string;
};

type RootNavbarProps = {
  logoutAction: () => Promise<void>;
};

const allLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/logic-arena", label: "Logic Arena" },
  { href: "/interview", label: "Interview" },
  { href: "/interview-history", label: "History" },
  { href: "/profile", label: "Profile" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/tech-stack-explorer", label: "Tech Explorer" },
  { href: "/companies", label: "Companies" },
  { href: "/notifications", label: "Notifications" },
  { href: "/resume-lab", label: "Resume Lab" },
  { href: "/questions", label: "Questions" },
  { href: "/about", label: "About" },
  { href: "/contact-support", label: "Support" },
  { href: "/faq", label: "FAQ" },
  { href: "/settings", label: "Settings" },
];

const primaryLinkHrefs = new Set([
  "/",
  "/dashboard",
  "/logic-arena",
  "/interview",
  "/interview-history",
  "/profile",
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
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`header-link ${
                isActiveLink(pathname, item.href) ? "header-link--active" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}

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
                {secondaryLinks.map((item) => (
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
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/api/desktop-download" className="header-download">
            Download App
          </Link>

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
