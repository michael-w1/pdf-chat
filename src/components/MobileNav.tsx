'use client'

import { ArrowRight, Menu } from 'lucide-react'
import Link from 'next/link'
import { useClerk } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const MobileNav = ({ isAuth }: { isAuth: boolean }) => {
  const { openSignIn, openSignUp, signOut } = useClerk()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label='Toggle menu'
          className='text-muted-foreground hover:text-foreground'>
          <Menu className='size-4' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' sideOffset={8} className='w-52'>
        {!isAuth ? (
          <>
            <DropdownMenuItem
              onSelect={() => openSignUp()}
              className='cursor-pointer font-medium'>
              Get started
              <ArrowRight className='ml-auto size-4' />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => openSignIn()}
              className='cursor-pointer'>
              Sign in
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild className='cursor-pointer'>
              <Link href='/dashboard'>Dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => signOut({ redirectUrl: '/' })}
              className='cursor-pointer'>
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default MobileNav
