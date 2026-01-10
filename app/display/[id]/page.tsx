'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'github-markdown-css/github-markdown.css';

interface Memo {
  id: number;
  user_id: string;
  title: string;
  subtitle?: string;
  url?: string;
  content?: string;
  publish?: boolean;
  tags?: string;
  category: string;
  favorite: boolean;
  updated_at?: string;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
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
        
        // ユーザー名を取得
        if (data?.user_id) {
          const { data: profile, error: profileError } = await client
            .from('profiles')
            .select('atcoder_username')
            .eq('user_id', data.user_id)
            .single();
          
          if (!profileError && profile) {
            setUserName(profile.atcoder_username || 'Unknown');
          }
        }
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
            onClick={() => router.push('/')}
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
        <div className="w-full max-w-5xl h-full p-6 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              {/* User Name and Updated Time Display */}
              <div className="min-w-16">
                {memo.user_id && (
                  <div className="text-sm text-gray-500">
                    by <span className="font-medium text-gray-700">{userName || 'Loading...'}</span>
                  </div>
                )}
              </div>
              
            </div>

            {/* Subtitle and URL */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {memo.subtitle && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Summary</label>
                  <p className="text-base text-gray-800 break-words">
                    {memo.subtitle}
                  </p>
                </div>
              )}

              {memo.url && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">URL</label>
                  <a
                    href={memo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-blue-600 hover:text-blue-800 hover:underline flex break-all"
                  >
                    <span className="break-all">{memo.url}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Content - Flexible height */}
            <div className="flex-1 flex flex-col min-h-0 mb-1">
              <label className="block text-base font-semibold text-gray-700 mb-2">Content</label>
              <div className="markdown-body border border-gray-300 rounded-lg p-4 bg-white min-h-[490px]">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {memo.content || "*Nothing to preview*"}
                </ReactMarkdown>
              </div>
              {/* Updated at timestamp - outside content box, bottom right */}
              {memo.updated_at && (
                <div className="text-right">
                  <span className="text-xs text-gray-400">
                    Last updated: {new Date(memo.updated_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom section - Tags, Category, Status */}
            <div className="flex items-end gap-15 pt-3 border-t border-gray-200">

              {/* Center: Tags */}
              {memo.tags && (
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {memo.tags.split(' ').filter(tag => tag.trim()).map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 mt-0.5 mb-0.5 text-base font-medium bg-blue-100 text-blue-800 rounded-full"
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