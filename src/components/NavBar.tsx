import Link from 'next/link';
import { buttonVariants } from "./ui/button";
import { auth, currentUser } from '@clerk/nextjs/server';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import UserAccountNav from "./UserAccountNav";
import MobileNav from "./MobileNav";

const NavBar = async () => {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;

  return (
    <nav className='sticky h-14 inset-x-0 top-0 z-30 w-full border-slate-800 bg-slate-950/75 backdrop-blur-lg transition-all border-b'>
      <div className="mx-auto w-full max-w-screen-xl px-2.5 md:px-20">
        <div className='flex h-14 items-center justify-between border-b border-slate-800'>
          <Link
            href='/'
            className='flex z-40 font-bold text-slate-50 tracking-tight hover:text-slate-200 transition-colors'>
            <span>PDF Chat</span>
          </Link>

          <MobileNav isAuth={!!user} />

          <div className='hidden items-center space-x-4 sm:flex'>
            {!user ? (
              <>
                <SignInButton>
                  <button className={buttonVariants({
                    variant: 'ghost',
                    size: 'sm',
                    className: 'text-slate-300 hover:bg-slate-900 hover:text-slate-50 transition-colors'
                  })}>
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className={buttonVariants({
                    variant: 'ghost',
                    size: 'sm',
                    className: 'text-slate-300 hover:bg-slate-900 hover:text-slate-50 transition-colors'
                  })}>
                    Register
                  </button>
                </SignUpButton>
              </>
            ) : (
              <>
                <Link
                  href='/dashboard'
                  className={buttonVariants({
                    variant: 'ghost',
                    size: 'sm',
                    className: 'text-slate-300 hover:bg-slate-900 hover:text-slate-50 transition-colors'
                  })}>
                  Dashboard
                </Link>

                <UserAccountNav
                  name={
                    !user.firstName || !user.lastName
                      ? 'Your Account'
                      : `${user.firstName} ${user.lastName}`
                  }
                  email={user.emailAddresses[0]?.emailAddress ?? ''}
          
                />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;