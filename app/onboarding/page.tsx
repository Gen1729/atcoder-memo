'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './_actions'

export default function OnboardingComponent() {
  const [error, setError] = React.useState('')
  const { user } = useUser()
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    const res = await completeOnboarding(formData)
    if (res?.message) {
      // Forces a token refresh and refreshes the `User` object
      await user?.reload()
      router.push('/individual')
    }
    if (res?.error) {
      setError(res?.error)
    }
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to AtCoder Memo</h1>
          <p className="mt-2 text-sm text-gray-600">Please tell us about your AtCoder profile</p>
        </div>
        
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="atcoderUsername" className="block text-sm font-medium text-gray-700 mb-1">
              AtCoder Username
            </label>
            <input 
              type="text" 
              id="atcoderUsername"
              name="atcoderUsername" 
              placeholder="your_atcoder_username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="favoriteLanguage" className="block text-sm font-medium text-gray-700 mb-1">
              Favorite Programming Language
            </label>
            <select 
              id="favoriteLanguage"
              name="favoriteLanguage" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              required
            >
              <option value="">Select a language</option>
              <option value="None">None</option>
              <option value="Python">Python</option>
              <option value="C++">C++</option>
              <option value="Java">Java</option>
              <option value="JavaScript">JavaScript</option>
              <option value="TypeScript">TypeScript</option>
              <option value="Rust">Rust</option>
              <option value="Go">Go</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div>
            <label htmlFor="atcoderRate" className="block text-sm font-medium text-gray-700 mb-1">
              AtCoder Rating (Optional)
            </label>
            <input 
              type="number" 
              id="atcoderRate"
              name="atcoderRate" 
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">Error: {error}</p>}
          
          <button 
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Complete Setup
          </button>
        </form>
      </div>
    </div>
  )
}