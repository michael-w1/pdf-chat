import Link from "next/link";
import { FileText } from "lucide-react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button, buttonVariants } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import UserAccountNav from "./UserAccountNav";
import MobileNav from "./MobileNav";

const NavBar = async () => {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;

  return (
    <header className="sticky inset-x-0 top-0 z-30 h-14 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="size-3.5" />
          </span>
          PDF Chat
        </Link>

        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <MobileNav isAuth={!!user} />
        </div>

        <nav className="hidden items-center gap-1 sm:flex">
          <ThemeToggle />

          {!user ? (
            <>
              <SignInButton>
                <button className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton>
                <button className={buttonVariants({ variant: "default", size: "sm" })}>
                  Get started
                </button>
              </SignUpButton>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>

              <UserAccountNav
                name={
                  !user.firstName || !user.lastName
                    ? "Your Account"
                    : `${user.firstName} ${user.lastName}`
                }
                email={user.emailAddresses[0]?.emailAddress ?? ""}
              />
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
