'use client'
import { useEffect, useState, useRef } from 'react'
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
}

export default function Edit({ params }: { params: Promise<{ id: string }> }){
  const [id, setId] = useState<string>('');
  const [loading,setLoading] = useState<boolean>(false);
  const [title,setTitle] = useState<string>("");
  const [subtitle,setSubtitle] = useState<string>("");
  const [url,setUrl] = useState<string>("");
  const [content,setContent] = useState<string>("");
  const [publish,setPublish] = useState<boolean>(false);
  const [tags,setTags] = useState<string>("");
  const [category,setCategory] = useState<string>("");
  const [favorite,setFavorite] = useState<boolean>(false);
  const [isPreview,setIsPreview] = useState<boolean>(false);
  const [prevMemo, setPrevMemo] = useState<Memo>();
  
  // 初回ロード完了フラグ: DBデータ読み込みが完了したかを追跡
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  // 保存処理中フラグ: useRefで即座に反映（状態更新の遅延を回避）
  const isSavingRef = useRef<boolean>(false);
  // スクロール位置を保存するref
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollPositionRef = useRef<number>(0);

  const router = useRouter();
  const { user } = useUser();
  const { session } = useSession();

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

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

  // Fetch memo data
  useEffect(() => {
    if (!user || !session || !id) return;

    async function loadMemo() {
      setLoading(true);
      
      // sessionStorageから下書きを取得
      const draftKey = `memo-draft-${id}`;
      const savedDraft = sessionStorage.getItem(draftKey);
      
      // DBからメモデータを取得
      const { data, error } = await client
        .from('memos')
        .select('title, subtitle, url, content, publish, tags, category, favorite')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading memo:', error);
        setLoading(false);
        return;
      }

      // 下書きがある場合は復元するか確認
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const usesDraft = window.confirm(
          'An unsaved draft has been found. Would you like to restore the draft?'
        );
        
        if (usesDraft) {
          // 下書きを復元
          setTitle(draft.title || '');
          setSubtitle(draft.subtitle || '');
          setUrl(draft.url || '');
          setContent(draft.content || '');
          setPublish(draft.publish || false);
          setTags(draft.tags || '');
          setCategory(draft.category || '');
          setFavorite(draft.favorite || false);
        } else {
          // 下書きを破棄してDBデータを使用
          sessionStorage.removeItem(draftKey);
          setTitle(data.title || '');
          setSubtitle(data.subtitle || '');
          setUrl(data.url || '');
          setContent(data.content || '');
          setPublish(data.publish || false);
          setTags(data.tags || '');
          setCategory(data.category || '');
          setFavorite(data.favorite || false);
        }
      } else {
        // 下書きがない場合はDBデータをそのまま使用
        setTitle(data.title || '');
        setSubtitle(data.subtitle || '');
        setUrl(data.url || '');
        setContent(data.content || '');
        setPublish(data.publish || false);
        setTags(data.tags || '');
        setCategory(data.category || '');
        setFavorite(data.favorite || false);
      }

      setPrevMemo(data);
      
      setInitialLoadComplete(true);
      setLoading(false);
    }

    if (!prevMemo)loadMemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session, id]);

  // sessionStorageに自動保存する機能
  // 初回ロード完了後、フォームの値が変わるたびにsessionStorageに保存
  useEffect(() => {
    if (!id || !initialLoadComplete) return;
    
    // フォームデータをオブジェクトにまとめる
    const formData = {
      title,
      subtitle,
      url,
      content,
      publish,
      tags,
      category,
      favorite,
    };
    
    // sessionStorageに保存（メモIDをキーに使用）
    const draftKey = `memo-draft-${id}`;
    sessionStorage.setItem(draftKey, JSON.stringify(formData));
    
  }, [id, title, subtitle, url, content, publish, tags, category, favorite, initialLoadComplete]);

  // ページ離脱時の警告
  // 変更がある場合、ページを離れようとすると警告を表示
  // isSavingRef.current を使うことで保存処理中は警告を出さない
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!prevMemo || prevMemo.title != title || prevMemo.subtitle != subtitle || prevMemo.content != content || prevMemo.tags != tags){
        if (!isSavingRef.current) {
          e.preventDefault();
          e.returnValue = ''; // Chrome requires returnValue to be set
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, subtitle, content, tags, prevMemo]);

  // PreviewからWriteに戻った時にスクロール位置を復元
  useEffect(() => {
    if (!isPreview && contentTextareaRef.current) {
      contentTextareaRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [isPreview]);

  async function editMemo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // 保存処理開始: refを使って即座にフラグを立てる
    isSavingRef.current = true;
    setLoading(true);

    const fixedTags = tags.split(' ').filter(tag => tag.trim());
    const uniqueFixedTags = [...new Set(fixedTags)].join(" ");

    const { error } = await client
      .from('memos')
      .update({
        title,
        subtitle,
        url,
        content,
        publish,
        tags : uniqueFixedTags,
        category,
        favorite,
      })
      .eq('id', id);

    setLoading(false);
    
    if (error) {
      console.error('Error creating memo:', error);
      alert(`Error: ${error.message}`);
      isSavingRef.current = false; // エラー時はフラグをリセット
      return;
    }
    
    // 保存成功: sessionStorageの下書きを削除
    const draftKey = `memo-draft-${id}`;
    sessionStorage.removeItem(draftKey);
    
    // useRefを使用しているため、即座に遷移しても問題なし
    router.push(`/individual/display/${id}`);
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50 items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-5xl h-full p-6 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  if(prevMemo && prevMemo.title == title && prevMemo.subtitle == subtitle && prevMemo.content == content && prevMemo.tags == tags){
                    sessionStorage.removeItem(`memo-draft-${id}`);
                  }
                  router.push(`/individual/display/${id}`)
                }}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900 flex-1 text-center">Edit Memo</h1>
              <div>
                <label className="container isScale">
                  <input 
                    type="checkbox" 
                    id="favorite"
                    name="favorite"
                    onChange={(e) => setFavorite(e.target.checked)} 
                    checked={favorite}
                  />
                  <svg height="24px" id="Layer_1" version="1.2" viewBox="0 0 24 24" width="24px" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"><g><g><path d="M9.362,9.158c0,0-3.16,0.35-5.268,0.584c-0.19,0.023-0.358,0.15-0.421,0.343s0,0.394,0.14,0.521    c1.566,1.429,3.919,3.569,3.919,3.569c-0.002,0-0.646,3.113-1.074,5.19c-0.036,0.188,0.032,0.387,0.196,0.506    c0.163,0.119,0.373,0.121,0.538,0.028c1.844-1.048,4.606-2.624,4.606-2.624s2.763,1.576,4.604,2.625    c0.168,0.092,0.378,0.09,0.541-0.029c0.164-0.119,0.232-0.318,0.195-0.505c-0.428-2.078-1.071-5.191-1.071-5.191    s2.353-2.14,3.919-3.566c0.14-0.131,0.202-0.332,0.14-0.524s-0.23-0.319-0.42-0.341c-2.108-0.236-5.269-0.586-5.269-0.586    s-1.31-2.898-2.183-4.83c-0.082-0.173-0.254-0.294-0.456-0.294s-0.375,0.122-0.453,0.294C10.671,6.26,9.362,9.158,9.362,9.158z"></path></g></g></svg>
                </label>
              </div>
            </div>
            
            <form onSubmit={editMemo} className="flex flex-col">
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
                  <label htmlFor="subtitle" className="block text-base font-semibold text-gray-700 mb-1">
                    Summary
                  </label>
                  <input 
                    type="text" 
                    id="subtitle"
                    name="subtitle" 
                    placeholder="Supplementary Information (Option)"
                    onChange={(e) => setSubtitle(e.target.value)} 
                    value={subtitle}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="url" className="block text-base font-semibold text-gray-700 mb-1">
                    URL
                  </label>
                  <input 
                    type="url" 
                    id="url"
                    name="url" 
                    placeholder="https://example.com (Option)"
                    onChange={(e) => setUrl(e.target.value)} 
                    value={url}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Content - Flexible height */}
              <div className="flex flex-col mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="content" className="block text-base font-semibold text-gray-700">
                    Content
                  </label>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsPreview(false)}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        !isPreview
                          ? 'bg-white text-gray-900 border-r border-gray-300'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-r border-gray-300'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // WriteからPreviewに切り替える前にスクロール位置を保存
                        if (!isPreview && contentTextareaRef.current) {
                          scrollPositionRef.current = contentTextareaRef.current.scrollTop;
                        }
                        setIsPreview(true);
                      }}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        isPreview
                          ? 'bg-white text-gray-900'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>
                {isPreview ? (
                  <div className="markdown-body border border-gray-300 rounded-lg p-4 bg-white min-h-[325px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {content || "*Nothing to preview*"}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <textarea 
                    ref={contentTextareaRef}
                    id="content"
                    name="content"
                    placeholder="Detailed Content (Option)"
                    onChange={(e) => setContent(e.target.value)}
                    value={content}
                    className="flex-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[325px]"
                  />
                )}
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
                  <label htmlFor="publish" className="ml-2 text-base font-semibold text-gray-700 cursor-pointer whitespace-nowrap">
                    Publish
                  </label>
                </div>

                {/* Center-Left: Tags */}
                <div className="flex-1 max-w-md">
                  <label htmlFor="tags" className="block text-base font-semibold text-gray-700 mb-1">
                    tags (space delimiter)
                  </label>
                  <input 
                    type="text" 
                    id="tags"
                    name="tags" 
                    placeholder="dp algorithm"
                    onChange={(e) => setTags(e.target.value)} 
                    value={tags}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Right: Category */}
                <div className="w-48">
                  <label htmlFor="category" className="block text-base font-semibold text-gray-700 mb-1">
                    category
                  </label>
                  <select 
                    id="category"
                    name="category" 
                    onChange={(e) => setCategory(e.target.value)} 
                    value={category}
                    required
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Please Select</option>
                    <option value="algorithm">algorithm</option>
                    <option value="dataStructure">dataStructure</option>
                    <option value="math">math</option>
                    <option value="others">others</option>
                  </select>
                </div>
              </div>

              {/* Edit and Cancel Buttons - Bottom Right */}
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    if (!prevMemo || prevMemo.title != title || prevMemo.subtitle != subtitle || prevMemo.content != content || prevMemo.tags != tags){
                      if (!window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.'))return;
                    }
                    sessionStorage.removeItem(`memo-draft-${id}`);
                    router.push(`/individual/display/${id}`);
                  }}
                  className="flex items-center px-4.5 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex items-center px-4.5 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}