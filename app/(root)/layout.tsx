import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/actions/auth.action";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  return (
    <div className="root-layout">
      <nav>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
            <h2 className="text-primary-100">Ai Interview Prepration</h2>
          </Link>

          <div className="flex items-center gap-2 whitespace-nowrap">
            <Link href="/" className="btn-secondary !px-4 !min-h-9">
              Homepage
            </Link>
            <Link href="/dashboard" className="btn-secondary !px-4 !min-h-9">
              Dashboard
            </Link>
            <Link href="/leaderboard" className="btn-secondary !px-4 !min-h-9">
              Leaderboard
            </Link>
            <Link href="/resume-lab" className="btn-secondary !px-4 !min-h-9">
              Resume Lab
            </Link>
            <Link href="/questions" className="btn-secondary !px-4 !min-h-9">
              Questions
            </Link>
            <Link href="/settings" className="btn-secondary !px-4 !min-h-9">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
};

export default Layout;
