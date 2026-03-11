import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/actions/auth.action";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/api/desktop-download", label: "Download App" },
  { href: "/profile", label: "Profile" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/interview-history", label: "History" },
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

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  return (
    <div className="root-layout">
      <nav>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
            <h2 className="text-primary-100 text-lg sm:text-2xl">
              Ai Interview Prepration
            </h2>
          </Link>

          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="btn-secondary !min-h-9 !w-full !px-3 text-center text-sm sm:!px-4"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
};

export default Layout;
