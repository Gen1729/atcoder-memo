'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'github-markdown-css/github-markdown.css';

import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

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

interface Comment {
  unique_id: string;
  id: string;
  user_id: string;
  content: string;
  created_at?: string;
}

function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const router = useRouter();
  const { user } = useUser();
  const { session } = useSession();
  
  // コメント機能用のstate
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isCommentPreview, setIsCommentPreview] = useState<boolean>(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

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

  // コメント送信処理
  async function handleSubmitComment(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      alert('You must be logged in to comment.');
      return;
    }

    const client = createClerkSupabaseClient();
    const { error } = await client.from('comments').insert({
      id: id, // メモのID
      user_id: user.id, // 認証されたユーザーのID
      content: newComment,
    })

    if (error) {
      console.error('Error creating comment:', error);
      alert(`Error: ${error.message}`);
      return;
    }

    setNewComment('');
    setIsCommentPreview(false);

    loadComment();
  };

  // コメントを読み込む関数
  async function loadComment() {
    setLoading(true);
    const client = createClerkSupabaseClient();
    const { data, error } = await client
      .from('comments')
      .select('*')
      .eq('id', id)

    if (error) {
      console.error('Error loading comments:', error);
    } else {
      setComments(data);

      // ユニークなuser_idを抽出
      const uniqueUserIds = [...new Set(data.map(comment => comment.user_id))].filter(Boolean);
      
      if (uniqueUserIds.length > 0) {
        // プロファイル情報を一括取得
        const { data: profiles, error: profileError } = await client
          .from('profiles')
          .select('user_id, atcoder_username')
          .in('user_id', uniqueUserIds);
        
        if (!profileError && profiles) {
          // user_id → atcoder_usernameのマップを作成
          const nameMap: Record<string, string> = {};
          profiles.forEach(profile => {
            nameMap[profile.user_id] = profile.atcoder_username || 'Unknown';
          });
          setUserNames(nameMap);
        }
      }
    }
    setLoading(false);
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
    loadComment();

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
            <div className="flex items-center justify-between gap-3 mb-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 break-words">
                  {memo.title}
                </h1>
              </div>
              <div className="flex-shrink-0">
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
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]} rehypePlugins={[rehypeKatex]}>
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

            {/* Comments Section */}
            <div className="mt-5 pt-5 border-t-2 border-gray-300">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Comments ({comments.length})</h2>
              
              {/* Comment Input */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-base font-semibold text-gray-700">
                    Add a comment
                  </label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsCommentPreview(false)}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        !isCommentPreview
                          ? 'bg-white text-gray-900 border-r border-gray-300'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-r border-gray-300'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCommentPreview(true)}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        isCommentPreview
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                
                <form onSubmit={handleSubmitComment}>
                  {isCommentPreview ? (
                    <>
                      <div className="markdown-body border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[150px]">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {newComment || "*Nothing to preview*"}
                        </ReactMarkdown>
                      </div>
                      <div className="p-[3px]"></div>
                    </>
                    
                  ) : (
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={user ? "Write a comment... (Markdown supported)" : "Please login to post comment"}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[150px]"
                      rows={4}
                    />
                  )}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newComment.trim() || !user}
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Post Comment
                    </button>
                  </div>
                </form>
              </div>

              {/* Comments Thread */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-1 text-gray-500">
                    <p>No comments yet.</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.unique_id} className="border border-gray-300 rounded-lg overflow-hidden">
                      {/* Header - User info and timestamp */}
                      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">{userNames[comment.user_id]}</span>
                          {comment.created_at && (
                            <span className="text-sm text-gray-600">
                              {new Date(comment.created_at).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Comment body */}
                      <div className="markdown-body bg-white p-4">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {comment.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50 items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <DisplayPage params={params} />
    </Suspense>
  );
}