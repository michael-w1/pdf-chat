'use client'

import { ArrowRight, Menu } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const MobileNav = ({ isAuth }: { isAuth: boolean }) => {
  return (
    <div className='sm:hidden'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Toggle Menu'
            className='text-slate-200 hover:text-slate-900 hover:bg-slate-100 focus-visible:ring-0'>
            <Menu className='h-5 w-5' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align='end'
          sideOffset={8}
          className='w-56 bg-white border border-slate-200 text-slate-900 shadow-md'>
          {!isAuth ? (
            <>
              <DropdownMenuItem asChild>
                <Link
                  href='/sign-up'
                  className='flex items-center font-semibold text-blue-600 focus:text-blue-700 focus:bg-slate-100 cursor-pointer'>
                  Get started
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className='bg-slate-100' />
              <DropdownMenuItem asChild>
                <Link
                  href='/sign-in'
                  className='font-medium text-slate-700 focus:bg-slate-100 focus:text-slate-900 cursor-pointer'>
                  Sign in
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className='bg-slate-100' />
              <DropdownMenuItem asChild>
                <Link
                  href='/pricing'
                  className='font-medium text-slate-700 focus:bg-slate-100 focus:text-slate-900 cursor-pointer'>
                  Pricing
                </Link>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link
                  href='/dashboard'
                  className='font-medium text-slate-700 focus:bg-slate-100 focus:text-slate-900 cursor-pointer'>
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className='bg-slate-100' />
              <DropdownMenuItem asChild>
                <Link
                  href='/sign-out'
                  className='font-medium text-slate-600 focus:bg-slate-100 focus:text-slate-700 cursor-pointer'>
                  Sign out
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default MobileNav