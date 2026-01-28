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
          <SignInButton>
            <button className="bg-white text-[#6c47ff] border-2 border-[#6c47ff] rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer hover:bg-gray-50 transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer hover:bg-[#5a38d9] transition-colors">
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
