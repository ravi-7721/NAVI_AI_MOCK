import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated, signOut } from "@/lib/actions/auth.action";
import RootNavbar from "@/components/RootNavbar";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  const logout = async () => {
    "use server";

    await signOut();
    redirect("/sign-in");
  };

  return (
    <div className="root-layout">
      <nav className="w-full">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
            <h2 className="text-primary-100 text-lg sm:text-2xl">
              AI Interview Prepration
            </h2>
          </Link>

          <RootNavbar logoutAction={logout} />
        </div>
      </nav>

      {children}
    </div>
  );
};

export default Layout;

