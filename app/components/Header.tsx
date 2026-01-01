'use client'
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { CustomUserButton } from './CustomUserButton'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <header className={`flex justify-between items-center p-4 gap-4 h-16 ${pathname.includes('individual') ? "bg-blue-100" : "bg-green-100"}`}>
      <button onClick={() => {router.push('/')}} className="font-bold text-lg">Atcoder memo</button>
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton />
          <SignUpButton>
            <button className="bg-[#6c47ff] text-ceramic-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <CustomUserButton />
        </SignedIn>
      </div>
    </header>
  )
}
