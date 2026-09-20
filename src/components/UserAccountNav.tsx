'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Button } from './ui/button'
import Link from 'next/link'
import { useClerk } from '@clerk/nextjs'

interface UserAccountNavProps {
  email: string | undefined
  name: string
}

/** First letters of the user's name, or a fallback glyph. */
function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return letters || '?'
}

const UserAccountNav = ({ email, name }: UserAccountNavProps) => {
  const { signOut } = useClerk()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Account menu'
          className='ml-1 rounded-full border border-border bg-muted text-xs font-medium'>
          {initials(name)}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' sideOffset={8} className='w-60'>
        <div className='flex flex-col gap-0.5 px-2 py-1.5'>
          <p className='truncate text-sm font-medium'>{name}</p>
          {email ? (
            <p className='truncate text-xs text-muted-foreground'>{email}</p>
          ) : null}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className='cursor-pointer'>
          <Link href='/dashboard'>Dashboard</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => signOut({ redirectUrl: '/' })}
          className='cursor-pointer'>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserAccountNav
