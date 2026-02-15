'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Image from 'next/image';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import 'github-markdown-css/github-markdown.css';

import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

import { UserProfileModal } from '../../components/UserProfileModal'
import { CodeBlock } from '../../components/CodeBlock'

interface Profile {
  atcoder_username: string;
  icon?: string;
}

interface Memo {
  user_id: string;
  title: string;
  subtitle?: string;
  url?: string;
  content?: string;
  tags?: string;
  category: string;
  updated_at?: string;
  profiles: Profile | Profile[] | null;
}

interface Comment {
  unique_id: string;
  user_id: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  profiles: Profile | Profile[] | null;
}

function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>('');
  const router = useRouter();
  const { user } = useUser();
  const { session } = useSession();
  
  // コメント機能用のstate
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isCommentPreview, setIsCommentPreview] = useState<boolean>(false);
  
  // コメント編集用のstate
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [isEditPreview, setIsEditPreview] = useState<boolean>(false);

  // モーダル用のstate
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

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

  // コメント送信処理
  async function handleSubmitComment(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      alert('You must be logged in to comment.');
      return;
    }

    const { error } = await client
      .from('comments').insert({
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

  // コメント編集処理
  async function handleEditComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editContent.trim() || !editingCommentId) return;

    const { error } = await client
      .from('comments')
      .update({
        content: editContent,
      })
      .eq('unique_id', editingCommentId);

    if (error) {
      console.error('Error updating comment:', error);
      alert(`Error: ${error.message}`);
      return;
    }

    setEditingCommentId(null);
    setEditContent('');
    setIsEditPreview(false);
    loadComment();
  }

  // コメント削除処理
  async function handleDeleteComment(commentId: string) {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    const { error } = await client
      .from('comments')
      .delete()
      .eq('unique_id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      alert(`Error: ${error.message}`);
      return;
    }

    loadComment();
  }

  // コメントを読み込む関数（コメント作成・編集・削除後に使用）
  async function loadComment() {
    const [commentsResult] = await Promise.all([
      client
        .from('comments')
        .select('unique_id, user_id, content, created_at, updated_at, profiles(atcoder_username, icon)')
        .eq('id', id)
        .order('created_at', { ascending: true })
    ]);

    if (commentsResult.error) {
      console.error('Error loading comments:', commentsResult.error);
    } else {
      sessionStorage.setItem(`global-memo-comment-${id}`, JSON.stringify({
        memo: memo,
        comments: commentsResult.data
      }));

      setComments(commentsResult.data);
    }
  }

  // Fetch memo data
  useEffect(() => {
    if (!id) return;

    async function loadMemoAndComments() {
      setLoading(true);
      
      // メモとコメントを並列で取得
      const [memoResult, commentsResult] = await Promise.all([
        client
          .from('memos')
          .select('user_id, title, subtitle, url, content, tags, category, updated_at, profiles(atcoder_username, icon)')
          .eq('id', id)
          .eq('publish', true)
          .single(),
        client
          .from('comments')
          .select('unique_id, user_id, content, created_at, updated_at, profiles(atcoder_username, icon)')
          .eq('id', id)
          .order('created_at', { ascending: true })
      ]);

      // メモデータの処理
      if (memoResult.error) {
        console.error('Error loading memo:', memoResult.error);
      } else {
        setMemo(memoResult.data);
      }

      // コメントデータの処理
      if (commentsResult.error) {
        console.error('Error loading comments:', commentsResult.error);
      } else {
        setComments(commentsResult.data);
      }

      // Save to sessionStorage
      if (typeof window !== 'undefined' && !memoResult.error && !commentsResult.error) {
        sessionStorage.setItem(`global-memo-comment-${id}`, JSON.stringify({
          memo: memoResult.data,
          comments: commentsResult.data
        }));
      }

      setLoading(false);
    }

    if (typeof window === 'undefined') return;
    const savedState = sessionStorage.getItem(`global-memo-comment-${id}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const currentTime = Date.now();
        const savedTime = state.timestamp || 0;
        const waitTime = 5 * 60 * 1000; // 5分（ミリ秒）

        if (currentTime - savedTime > waitTime) {
          sessionStorage.removeItem(`global-memo-comment-${id}`);
          loadMemoAndComments();
          return;
        }

        setMemo(state.memo);
        setComments(state.comments);
        setLoading(false);
      } catch (error) {
        console.error('Failed to restore state:', error);
        sessionStorage.removeItem(`global-memo-comment-${id}`);
        loadMemoAndComments();
      }
    }else{
      loadMemoAndComments();
    }
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
                <h1 className="text-2xl font-bold text-gray-900 break-words text-center">
                  {memo.title}
                </h1>
              </div>
              <div className="flex-shrink-0">
                {memo.user_id && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {(() => {
                        const profile = Array.isArray(memo.profiles) 
                        ? memo.profiles[0] 
                        : memo.profiles;
                        const username = profile?.atcoder_username || 'Unknown';
                        const icon = profile?.icon;
                        console.log(profile);
                        console.log(memo);
                        return(
                          <>
                            <span>by</span><span className="font-medium text-gray-700">{username}</span>
                            {icon && (
                              <Image 
                                src={icon} 
                                alt={username}
                                width={24}
                                height={24}
                                className="rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedUserId(memo.user_id)
                                }}
                              />
                            )}
                          </>
                        )}
                      )()}
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
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]} 
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                    code: ({inline, className, children, ...props}: {inline?: boolean, className?: string, children?: React.ReactNode}) => {
                      if (inline) {
                        return <code className={className} {...props}>{children}</code>
                      }
                      return <CodeBlock className={className}>{String(children).replace(/\n$/, '')}</CodeBlock>
                    }
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
              {comments.length > 0 && (
                <h2 className="text-xl font-bold text-gray-900 mb-3">Comments ({comments.length})</h2>
              )}
              {/* Comments Thread */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <></>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.unique_id} className="border border-gray-300 rounded-lg overflow-hidden">
                      {editingCommentId === comment.unique_id ? (
                        /* 編集モード */
                        <>
                          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const profile = Array.isArray(comment.profiles) 
                                ? comment.profiles[0] 
                                : comment.profiles;
                                const username = profile?.atcoder_username || 'Unknown';
                                const icon = profile?.icon;
                                return(
                                  <>
                                    <span className="font-semibold text-gray-900 text-sm">{username}</span>
                                    {icon && (
                                      <Image 
                                        src={icon}
                                        alt={username}
                                        width={24}
                                        height={24}
                                        className="rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedUserId(comment.user_id)
                                        }}
                                      />
                                    )}
                                  </>
                                )}
                              )()}
                              <span className="text-sm text-gray-600">Editing...</span>
                            </div>
                            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setIsEditPreview(false)}
                                className={`px-3 py-1 text-xs font-medium transition-colors ${
                                  !isEditPreview
                                    ? 'bg-white text-gray-900 border-r border-gray-300'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-r border-gray-300'
                                }`}
                              >
                                Write
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditPreview(true)}
                                className={`px-3 py-1 text-xs font-medium transition-colors ${
                                  isEditPreview
                                    ? 'bg-white text-gray-900'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                Preview
                              </button>
                            </div>
                          </div>
                          <div className="bg-white p-4">
                            <form onSubmit={handleEditComment}>
                              {isEditPreview ? (
                                <>
                                  <div className="markdown-body border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[150px] mb-3">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                                      rehypePlugins={[rehypeRaw, rehypeKatex]}
                                      components={{
                                        a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                                        code: ({inline, className, children, ...props}: {inline?: boolean, className?: string, children?: React.ReactNode}) => {
                                          if (inline) {
                                            return <code className={className} {...props}>{children}</code>
                                          }
                                          return <CodeBlock className={className}>{String(children).replace(/\n$/, '')}</CodeBlock>
                                        }
                                      }}
                                    >
                                      {editContent || "*Nothing to preview*"}
                                    </ReactMarkdown>
                                  </div>
                                  <div className="p-[3px]"></div>
                                </>
                                
                              ) : (
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[150px]"
                                  rows={4}
                                />
                              )}
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditContent('');
                                    setIsEditPreview(false);
                                  }}
                                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={!editContent.trim()}
                                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Save
                                </button>
                              </div>
                            </form>
                          </div>
                        </>
                      ) : (
                        /* 通常表示モード */
                        <>
                          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const profile = Array.isArray(comment.profiles) 
                                ? comment.profiles[0] 
                                : comment.profiles;
                                const username = profile?.atcoder_username || 'Unknown';
                                const icon = profile?.icon;
                                return(
                                  <>
                                    <span className="font-semibold text-gray-900 text-sm">{username}</span>
                                    {icon && (
                                      <Image 
                                        src={icon}
                                        alt={username}
                                        width={24}
                                        height={24}
                                        className="rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedUserId(comment.user_id)
                                        }}
                                      />
                                    )}
                                  </>
                                )}
                              )()}
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
                              {comment.updated_at && comment.updated_at !== comment.created_at && (
                                <span className="text-xs text-gray-500 italic">(edited)</span>
                              )}
                            </div>
                            {user && user.id === comment.user_id && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.unique_id);
                                    setEditContent(comment.content);
                                    setIsEditPreview(false);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.unique_id)}
                                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="markdown-body bg-white p-4">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                              rehypePlugins={[rehypeRaw, rehypeKatex]}
                              components={{
                                a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                                code: ({inline, className, children, ...props}: {inline?: boolean, className?: string, children?: React.ReactNode}) => {
                                  if (inline) {
                                    return <code className={className} {...props}>{children}</code>
                                  }
                                  return <CodeBlock className={className}>{String(children).replace(/\n$/, '')}</CodeBlock>
                                }
                              }}
                            >
                              {comment.content}
                            </ReactMarkdown>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className={`${comments.length > 0 ? "mt-6" : ""} mb-6`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-base font-semibold text-gray-700">
                    Add a comment
                  </label>
                  {user ? (
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
                  ):(
                    <div className="text-base mr-3">
                      Please login to post your comment
                    </div>
                  )}
                </div>
                
                <form onSubmit={handleSubmitComment}>
                  {isCommentPreview ? (
                    <>
                      <div className="markdown-body border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[150px]">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                          rehypePlugins={[rehypeRaw, rehypeKatex]}
                          components={{
                            a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                            code: ({inline, className, children, ...props}: {inline?: boolean, className?: string, children?: React.ReactNode}) => {
                              if (inline) {
                                return <code className={className} {...props}>{children}</code>
                              }
                              return <CodeBlock className={className}>{String(children).replace(/\n$/, '')}</CodeBlock>
                            }
                          }}
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
                      placeholder={user ? "Write a comment... (Markdown supported)" : ""}
                      disabled={!user}
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
            </div>
          </div>
        </div>
      </div>
      {/* ユーザープロファイルモーダル */}
      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
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