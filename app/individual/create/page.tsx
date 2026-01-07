'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import '../../components/star.css'

export default function Create(){
  const [loading,setLoading] = useState<boolean>(false);
  const [title,setTitle] = useState<string>("");
  const [subtitle,setSubtitle] = useState<string>("");
  const [url,setUrl] = useState<string>("");
  const [content,setContent] = useState<string>("");
  const [publish,setPublish] = useState<boolean>(false);
  const [tags,setTags] = useState<string>("");
  const [category,setCategory] = useState<string>("");
  const [favorite,setFavorite] = useState<boolean>(false);
  
  // 変更追跡用
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  // 初回ロード完了フラグ
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  // 保存処理中フラグ
  const isSavingRef = useRef<boolean>(false);

  const router = useRouter();
  const { user } = useUser();
  const { session } = useSession();
  const isAdmin = user?.publicMetadata?.role === 'admin';

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

  // 初回ロード時にsessionStorageから下書きを復元
  useEffect(() => {
    const draftKey = 'memo-draft-new';
    const savedDraft = sessionStorage.getItem(draftKey);
    
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      if(draft.title == '' && draft.subtitle == '' && draft.url == '' && draft.content == '' && draft.tags == ''){
        sessionStorage.removeItem(draftKey);
        setHasChanges(false);
      }else{
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
          setHasChanges(true);
        } else {
          // 下書きを破棄
          sessionStorage.removeItem(draftKey);
          setHasChanges(false);
        }
      }
    }
    
    setInitialLoadComplete(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sessionStorageに自動保存する機能
  useEffect(() => {
    if (!initialLoadComplete) return;
    
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
    
    const draftKey = 'memo-draft-new';
    sessionStorage.setItem(draftKey, JSON.stringify(formData));

    // 変更があったことをマーク
    setHasChanges(true);
  }, [title, subtitle, url, content, publish, tags, category, favorite, initialLoadComplete]);

  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // 何か入力されているかチェック
      const hasContent = title || subtitle || url || content || tags;
      
      if (hasChanges && !isSavingRef.current && hasContent) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges, title, subtitle, url, content, tags]);

  async function createMemo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // 保存処理開始
    isSavingRef.current = true;
    setLoading(true);

    const fixedTags = tags.split(' ').filter(tag => tag.trim()).join(" ");

    const { error } = await client.from('memos').insert({
      title,
      subtitle,
      url,
      content,
      publish,
      tags : fixedTags,
      category,
      favorite,
    })

    setLoading(false);
    
    if (error) {
      console.error('Error creating memo:', error);
      alert(`Error: ${error.message}`);
      isSavingRef.current = false;
      return;
    }
    
    // 保存成功: sessionStorageの下書きを削除
    const draftKey = 'memo-draft-new';
    sessionStorage.removeItem(draftKey);
    
    // 変更フラグをリセット
    setHasChanges(false);
    
    // useRefを使用しているため、即座に遷移しても問題なし
    router.push('/individual');
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
              <h1 className="text-2xl font-bold text-gray-900 flex-1 text-center">New Memo</h1>
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
              <div className="flex-1 flex flex-col min-h-0 mb-3">
                <label htmlFor="content" className="block text-base font-semibold text-gray-700 mb-1">
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

              {/* Create Button - Bottom Right */}
              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  className="flex items-center px-4.5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}