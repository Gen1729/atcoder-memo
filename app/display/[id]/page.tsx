'use client'
import { useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface Memo {
  id: number;
  title: string;
  subtitle?: string;
  url?: string;
  content?: string;
  publish?: boolean;
  tags?: string;
  category: string;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>('');
  const router = useRouter();
  const { session } = useSession();

  // Unwrap params
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  // Create Supabase client
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

  // Fetch memo data
  useEffect(() => {
    if (!id) return;

    async function loadMemo() {
      setLoading(true);
      const client = createClerkSupabaseClient();
      const { data, error } = await client
        .from('memos')
        .select('*')
        .eq('id', id)
        .eq('publish', true)
        .single();

      if (error) {
        console.error('Error loading memo:', error);
      } else {
        setMemo(data);
      }
      setLoading(false);
    }

    loadMemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Add id to dependencies

  // Category color mapping
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'algorithm': 'bg-red-500',
      'dataStructure': 'bg-blue-500',
      'math': 'bg-green-500',
      'others': 'bg-gray-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50 items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!memo) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50 items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">No memo not found</p>
          <button
            onClick={() => router.push('/individual')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-4xl h-full p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col p-6">
            {/* Header with back button and title */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {memo.title}
                </h1>
              </div>
              <div className="w-16"></div> {/* Spacer for centering */}
            </div>

            {/* Subtitle and URL */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {memo.subtitle && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">Summary</label>
                  <p className="text-base text-gray-800">
                    {memo.subtitle}
                  </p>
                </div>
              )}

              {memo.url && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-1">URL</label>
                  <a
                    href={memo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    {memo.url}
                  </a>
                </div>
              )}
            </div>

            {/* Content - Flexible height */}
            <div className="flex-1 flex flex-col min-h-0 mb-3">
              <label className="block text-base font-semibold text-gray-700 mb-1">Content</label>
              <div className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg overflow-y-auto bg-white">
                <pre className="whitespace-pre-wrap font-sans text-base text-gray-900">
                  {memo.content}
                </pre>
              </div>
            </div>

            {/* Bottom section - Tags, Category, Status */}
            <div className="flex items-end gap-15 pt-3 border-t border-gray-200 mt-3">
              {/* Left: Publish Status */}
              <div className="flex items-center min-w-fit">
                <span className={`inline-flex items-center px-3 py-1.5 mb-1 rounded-full text-base font-medium ${memo.publish ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {memo.publish ? 'Publish' : 'Private'}
                </span>
              </div>

              {/* Center: Tags */}
              {memo.tags && (
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {memo.tags.split(' ').filter(tag => tag.trim()).map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 mb-1 text-base font-medium bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Right: Category */}
              {memo.category && (
                <div className="w-48">
                  <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(memo.category)} flex-shrink-0`} />
                    <span className="text-base text-gray-700">{memo.category}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}