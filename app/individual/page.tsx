'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

interface Category {
  all: number;
  algorithm: number;
  dataStructure: number;
  math: number;
  others: number;
}

interface Memo {
  id: number;
  title: string;
  subtitle?: string;
  url?: string;
  content?: string;
  publish?: boolean;
  tags?: string;
  category: string;
  favorite: boolean;
}

function IndividualPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState<string>("all");
  const [categoryNum, setCategoryNum] = useState<Category>();
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { user } = useUser();
  const { session } = useSession();
  
  // 検索クエリをURLパラメータから取得
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [tagQuery, setTagQuery] = useState<string>(searchParams.get('tag') || '');

  // デバウンス処理付きURL更新関数（300ms遅延）
  const updateSearchParams = useDebouncedCallback((search: string, tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // 検索クエリが空でない場合はパラメータに追加、空なら削除
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    
    if (tag) {
      params.set('tag', tag);
    } else {
      params.delete('tag');
    }
    
    // URLを更新（ページリロードなし）
    router.push(`${pathname}?${params.toString()}`);
  }, 300);

  // 検索入力時のハンドラ
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateSearchParams(value, tagQuery);
  };

  const handleTagChange = (value: string) => {
    setTagQuery(value);
    updateSearchParams(searchQuery, value);
  };

  // Category color mapping
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'all': 'bg-black',
      'algorithm': 'bg-red-500',
      'dataStructure': 'bg-blue-500',
      'math': 'bg-green-500',
      'others': 'bg-gray-500',
    };
    return colors[category] || 'bg-gray-500';
  };

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

  useEffect(() => {
    if (!user || !session) return;

    async function loadMemos() {
      setLoading(true);
      const client = createClerkSupabaseClient();
      const { data, error } = await client
        .from('memos')
        .select();
      
      if (error) {
        console.error('Error loading memo:', error);
      } else {
        setMemos(data);
      }

      const categoryCount: Category = 
      {
        all: 0,
        algorithm: 0,
        dataStructure: 0,
        math: 0,
        others: 0
      };

      if(data){
        data.forEach((c) => {
          const cat = c.category as keyof Category;
          if (cat in categoryCount) {
            categoryCount[cat]++;
          }
        });
        categoryCount.all = data.length;
      }

      setCategoryNum(categoryCount);
      setLoading(false);
    }

    loadMemos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session])

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Search Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Filter by name"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by tags"
              value={tagQuery}
              onChange={(e) => handleTagChange(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Menu Section */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <button 
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${!isFavorite ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => setIsFavorite(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              All Memo
            </button>
            
            <button
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${isFavorite ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => setIsFavorite(true)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Favorite Memo
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              category
            </h3>
            <div className="space-y-1">

              {categoryNum && Object.keys(categoryNum).map((key) => (
                <button 
                  key={key}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 ${key==category ? "bg-blue-100" : "hover:bg-gray-100"} rounded-lg transition-colors`}
                  onClick={() => setCategory(key)}
                >
                  <div className="flex gap-3">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(key)} flex-shrink-0 ml-2 mt-1.5`}/>
                    <span>{key}</span>
                  </div>
                  <span className="text-xs text-gray-500">{categoryNum[key as keyof Category] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom Buttons */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button 
            className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => {router.push('/')}}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Global Memo
          </button>
          
          <button className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Mail
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Memo</h1>
            <p className="text-sm text-gray-500 mt-1">{categoryNum?.all || 0}件のメモ</p>
          </div>
          
          <button 
            className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
            onClick={() => {router.push('/individual/create')}}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Memo
          </button>
        </header>

        {/* Memos Grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!loading && memos
              .filter((memo) => {
                // お気に入りフィルタ
                const favoriteMatch = !isFavorite || memo.favorite;
                
                // カテゴリーフィルタ
                const categoryMatch = category === "all" || memo.category === category;
                
                // タイトル検索フィルタ（部分一致、大文字小文字区別なし）
                const searchMatch = !searchQuery || 
                  memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (memo.subtitle && memo.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
                
                // タグ検索フィルタ（複数タグ対応、1つでも一致すればtrue）
                const tagMatch = !tagQuery || 
                  (() => {
                    if (!memo.tags) return false;
                    
                    // 検索タグをスペースで分割して配列にする
                    const searchTags = tagQuery.toLowerCase().split(' ').filter(tag => tag.trim());
                    const memoTagsLower = memo.tags.toLowerCase();
                    
                    // 検索タグのいずれか1つでもメモのタグに含まれていればtrue
                    return searchTags.some(searchTag => memoTagsLower.includes(searchTag));
                  })();
                
                return favoriteMatch && categoryMatch && searchMatch && tagMatch;
              })
              .map((memo) => (
              <div
                key={memo.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer min-h-[146px]"
                onClick={() => {router.push(`/individual/display/${memo.id}`)}}
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-xl font-bold text-gray-900 flex-1">
                    {memo.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    {memo.favorite && (
                      <svg className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                    {memo.category && (
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(memo.category)} flex-shrink-0`} title={memo.category} />
                    )}
                  </div>
                </div>
                {memo.subtitle && (
                  <p className="text-sm text-gray-600 mb-4">
                    {memo.subtitle}
                  </p>
                )}
                {memo.tags && memo.tags.trim().length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {memo.tags.split(' ').filter(tag => tag.trim()).map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Loading...</p>
            </div>
          )}

          {!loading && memos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 text-lg">No memo is here</p>
              <p className="text-gray-400 text-sm mt-2">Let&apos;s create new memo</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50 items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <IndividualPage />
    </Suspense>
  )
}