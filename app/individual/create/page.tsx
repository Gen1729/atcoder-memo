'use client'
import { useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function Create(){
  const [title,setTitle] = useState<string>("");
  const [subtitle,setSubtitle] = useState<string>("");
  const [url,setUrl] = useState<string>("");
  const [content,setContent] = useState<string>("");
  const [publish,setPublish] = useState<boolean>(false);
  const [tags,setTags] = useState<string>("");
  const [category,setCategory] = useState<string>("");

  const router = useRouter();
  const { user } = useUser()
  // The `useSession()` hook is used to get the Clerk session object
  // The session object is used to get the Clerk session token
  const { session } = useSession()

  // Create a custom Supabase client that injects the Clerk session token into the request headers
  function createClerkSupabaseClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        async accessToken() {
          return session?.getToken() ?? null;
        },
      },
    )
  }

  // Create a `client` object for accessing Supabase data using the Clerk token
  const client = createClerkSupabaseClient()

  async function createMemo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Insert memo into the database
    const { error } = await client.from('memos').insert({
      title,
      subtitle,
      url,
      content,
      publish,
      tags,
      category
    })
    
    if (error) {
      console.error('Error creating memo:', error);
      alert(`Error: ${error.message}`);
      return;
    }
    
    router.push('/individual');
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-4xl h-full p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => router.push('/individual')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">New Memo</h1>
              <div className="w-16"></div> {/* Spacer for centering */}
            </div>
            
            <form onSubmit={createMemo} className="flex-1 flex flex-col min-h-0">
              {/* Title */}
              <div className="mb-3">
                <label htmlFor="title" className="block text-base font-bold text-gray-900 mb-1">
                  Title
                </label>
                <input 
                  type="text" 
                  id="title"
                  name="title" 
                  placeholder="Memo's Title"
                  onChange={(e) => setTitle(e.target.value)} 
                  value={title}
                  required
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Subtitle and URL - Side by Side */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label htmlFor="subtitle" className="block text-sm font-semibold text-gray-700 mb-1">
                    Summary
                  </label>
                  <input 
                    type="text" 
                    id="subtitle"
                    name="subtitle" 
                    placeholder="Supplementary Information (Option)"
                    onChange={(e) => setSubtitle(e.target.value)} 
                    value={subtitle}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="url" className="block text-sm font-semibold text-gray-700 mb-1">
                    URL
                  </label>
                  <input 
                    type="url" 
                    id="url"
                    name="url" 
                    placeholder="https://example.com (Option)"
                    onChange={(e) => setUrl(e.target.value)} 
                    value={url}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Content - Flexible height */}
              <div className="flex-1 flex flex-col min-h-0 mb-3">
                <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-1">
                  Content
                </label>
                <textarea 
                  id="content"
                  name="content" 
                  placeholder="Detailed Content (Option)"
                  onChange={(e) => setContent(e.target.value)} 
                  value={content}
                  className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Bottom Section - Horizontal layout */}
              <div className="flex items-end gap-4 pt-3 border-t border-gray-200">
                {/* Left: Publish Checkbox */}
                <div className="flex items-center min-w-fit pb-2.5">
                  <input 
                    type="checkbox" 
                    id="publish"
                    name="publish" 
                    onChange={(e) => setPublish(e.target.checked)} 
                    checked={publish}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="publish" className="ml-2 text-sm font-semibold text-gray-700 cursor-pointer whitespace-nowrap">
                    Publish
                  </label>
                </div>

                {/* Center-Left: Tags */}
                <div className="flex-1 max-w-md">
                  <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 mb-1">
                    tags (space delimiter)
                  </label>
                  <input 
                    type="text" 
                    id="tags"
                    name="tags" 
                    placeholder="dp algorithm"
                    onChange={(e) => setTags(e.target.value)} 
                    value={tags}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Right: Category */}
                <div className="w-48">
                  <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-1">
                    category
                  </label>
                  <select 
                    id="category"
                    name="category" 
                    onChange={(e) => setCategory(e.target.value)} 
                    value={category}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Please Select</option>
                    <option value="algorithm">algorithm</option>
                    <option value="dataStructure">dataStructure</option>
                    <option value="math">math</option>
                    <option value="others">others</option>
                  </select>
                </div>
              </div>

              {/* Create Button - Bottom Right */}
              <div className="flex justify-end pt-3">
                <button 
                  type="submit"
                  className="flex items-center px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Memo
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}