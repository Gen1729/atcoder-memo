'use client'
import { useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import '../../../components/star.css'

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'github-markdown-css/github-markdown.css';

import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

interface Memo {
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
  const router = useRouter();
  const { user } = useUser();
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

  const client = createClerkSupabaseClient();

  // Fetch memo data
  useEffect(() => {
    if (!user || !session || !id) return;

    async function loadMemo() {
      setLoading(true);
      const { data, error } = await client
        .from('memos')
        .select('title, subtitle, url, content, publish, tags, category, favorite, updated_at')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading memo:', error);
      } else {
        setMemo(data);
        sessionStorage.setItem(`individual-memo-${id}`, JSON.stringify({
          data
        }));
      }
      
      setLoading(false);
    }

    if (typeof window === 'undefined') return;
    const savedState = sessionStorage.getItem(`individual-memo-${id}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setMemo(state.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to restore state:', error);
        sessionStorage.removeItem(`individual-memo-${id}`);
        loadMemo();
      }
    }else{
      loadMemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session, id]);

  const handleDelete = () => {
    if (!user || !session || !id) return;

    async function deleteMemo() {
      setLoading(true);

      const { error } = await client
        .from('memos')
        .delete()
        .eq('id', id)
        .single();

      sessionStorage.removeItem(`individual-memo-${id}`);

      setLoading(false);

      if (error) {
        console.error('Error creating memo:', error);
        alert(`Error: ${error.message}`);
        return;
      }
    }

    deleteMemo();

    router.push('/individual')
  }

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
        <div className="w-full max-w-5xl h-full p-6 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <button
                onClick={() => router.push('/individual')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 break-words text-center">
                  {memo.title}
                </h1>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Edit Button */}
                <button
                  onClick={() => router.push(`/individual/edit/${id}`)}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                
                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (window.confirm('Do you really want to delete this memo?')) {
                      handleDelete();
                    }
                  }}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
                
                {/* Favorite Star */}
                <label className="container">
                  <input 
                    readOnly
                    type="checkbox" 
                    id="favorite"
                    name="favorite"
                    checked={memo.favorite}
                  />
                  <svg height="24px" id="Layer_1" version="1.2" viewBox="0 0 24 24" width="24px" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><g><g><path d="M9.362,9.158c0,0-3.16,0.35-5.268,0.584c-0.19,0.023-0.358,0.15-0.421,0.343s0,0.394,0.14,0.521    c1.566,1.429,3.919,3.569,3.919,3.569c-0.002,0-0.646,3.113-1.074,5.19c-0.036,0.188,0.032,0.387,0.196,0.506    c0.163,0.119,0.373,0.121,0.538,0.028c1.844-1.048,4.606-2.624,4.606-2.624s2.763,1.576,4.604,2.625    c0.168,0.092,0.378,0.09,0.541-0.029c0.164-0.119,0.232-0.318,0.195-0.505c-0.428-2.078-1.071-5.191-1.071-5.191    s2.353-2.14,3.919-3.566c0.14-0.131,0.202-0.332,0.14-0.524s-0.23-0.319-0.42-0.341c-2.108-0.236-5.269-0.586-5.269-0.586    s-1.31-2.898-2.183-4.83c-0.082-0.173-0.254-0.294-0.456-0.294s-0.375,0.122-0.453,0.294C10.671,6.26,9.362,9.158,9.362,9.158z"></path></g></g></svg>
                </label>
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
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                  }}
                >
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
              {/* Left: Publish Status */}
              <div className="flex items-center min-w-fit">
                <span className={`inline-flex items-center px-3 py-1.5 mt-0.5 mb-0.5 rounded-full text-base font-medium ${memo.publish ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
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