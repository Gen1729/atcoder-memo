'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation';

interface Memo {
  id: string;
  title: string;
  subtitle?: string;
  publish?: boolean;
  tags?: string;
  category: string;
  favorite: boolean;
  created_at?: string;
}

function IndividualPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState<string>("all");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const { user } = useUser();
  const { session } = useSession();
  
  // 検索クエリをURLパラメータから取得
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [tagQuery, setTagQuery] = useState<string>(searchParams.get('tag') || '');
  
  // 無限スクロール用のstate
  const [page, setPage] = useState<number>(0); // 現在のページ番号
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const ITEMS_PER_PAGE = 9;
  
  // ソート順のstate (true: 降順, false: 昇順)
  const [isDescending, setIsDescending] = useState<boolean>(true);

  // 初回ロードとカテゴリ・ソート順変更時
  useEffect(() => {
    setMemos([]);
    setPage(0);
    setHasMore(true);
    loadMemos(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDescending, category, isFavorite]);

  // 「もっと読み込む」ボタンのハンドラ
  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadMemos(page + 1, false);
    }
  };

  // 検索入力時のハンドラ
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleTagChange = (value: string) => {
    setTagQuery(value);
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

  const client = createClerkSupabaseClient();

  async function loadMemos(pageNum: number, isInitial: boolean) {
    if (!user || !session) return;
    
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    // rangeの開始と終了を計算
    const from = pageNum * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    // user_idでフィルタリング
    let query = client
      .from('memos')
      .select('id, title, subtitle, publish, tags, category, favorite, created_at')
      .eq('user_id', user!.id);

    // favoriteフィルタ
    if (isFavorite) {
      query = query.eq('favorite', true);
    }

    // categoryフィルタ
    if (category != 'all') {
      query = query.eq('category', category);
    }

    // searchQueryがある場合
    if (searchQuery && searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,subtitle.ilike.%${searchQuery}%`);
    }

    // tagQueryがある場合
    if (tagQuery && tagQuery.trim()) {
      const tags = tagQuery.split(' ').filter(tag => tag.trim());
      if (tags.length > 0) {
        const tagConditions = tags.map(tag => `tags.ilike.%${tag}%`).join(',');
        query = query.or(tagConditions);
      }
    }

    query = query
      .order('created_at', { ascending: !isDescending })
      .range(from, to);

    const { data, error } = await query;
    
    if (error) {
      console.error('Error loading memo:', error);
    } else {
      if (data && data.length > 0) {
        if (isInitial) {
          setMemos(data);
        } else {
          setMemos(prev => [...prev, ...data]);
        }
        setPage(pageNum);
        
        // 取得したデータが9個未満なら、もうデータがない
        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    }
      
    setLoading(false);
    setLoadingMore(false);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Search Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Filter by Word"
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
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Filter by Tags"
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
          <button
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center"
            onClick={() => {
              setMemos([]);
              setPage(0);
              setHasMore(true);
              loadMemos(0, true);
            }}
          >
            <svg
              className="w-5 h-5 mr-2"
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
            Search
          </button>
        </div>

        {/* Menu Section */}
        <nav className="flex-1 pl-4 pr-4 pb-4 pt-6 overflow-y-auto">
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-1">
              <button 
                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${!isFavorite ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
                onClick={() => {setIsFavorite(false);}}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                All
              </button>
              
              <button
                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${isFavorite ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
                onClick={() => {setIsFavorite(true);}}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Favorite
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              category
            </h3>
            <div className="space-y-1">
              {['all','algorithm','dataStructure','math','others'].map((key) => (
                <button 
                  key={key}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 ${key==category ? "bg-blue-100" : "hover:bg-gray-100"} rounded-lg transition-colors`}
                  onClick={() => setCategory(key)}
                >
                  <div className="flex gap-3">
                    <div className={`w-3 h-3 rounded-full ${getCategoryColor(key)} flex-shrink-0 ml-2 mt-1.5`}/>
                    <span>{key}</span>
                  </div>
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
      <main className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Memo</h1>
            {/* <p className="text-sm text-gray-500 mt-1">{categoryNum?.all || 0} memos</p> */}
          </div>
          
          <div className="flex items-center gap-4">
            {/* ソート順トグル */}
            <button
              onClick={() => setIsDescending(!isDescending)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title={isDescending ? "Descending order（Newest）" : "Ascending order（Oldest）"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isDescending ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                )}
              </svg>
              <span>{isDescending ? "Newest" : "Oldest"}</span>
            </button>
            
            <button 
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
              onClick={() => {router.push('/individual/create')}}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Memo
            </button>
          </div>
        </header>

        {/* Memos Grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memos.map((memo) => (
                <div
                  key={memo.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow cursor-pointer min-h-[183px] flex flex-col"
                  onClick={() => {router.push(`/individual/display/${memo.id}`)}}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900 flex-1 truncate" title={memo.title}>
                      {memo.title}
                    </h2>
                    <div className="flex items-center ml-2 flex-shrink-0">
                      {memo.category && (
                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(memo.category)} flex-shrink-0`} title={memo.category} />
                      )}
                    </div>
                  </div>
                  
                  {/* Subtitle section with min height */}
                  <div className="min-h-[24px] mb-3">
                    {memo.subtitle && (
                      <p className="text-sm text-gray-600 truncate" title={memo.subtitle}>
                        {memo.subtitle}
                      </p>
                    )}
                  </div>
                  
                  {/* Tags section with min height */}
                  <div className="min-h-[24px] mb-2">
                    {memo.tags && memo.tags.trim().length > 0 && (
                      <div className="flex gap-2 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {memo.tags.split(' ').filter(tag => tag.trim()).map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full whitespace-nowrap flex-shrink-0"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    {/* Publish/Private status */}
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      memo.publish 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {memo.publish ? 'Publish' : 'Private'}
                    </span>
                    
                    {/* Favorite star */}
                    {memo.favorite && (
                      <svg className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </div>
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
              <p className="text-gray-500 text-lg">No memo is found</p>
              <p className="text-gray-400 text-sm mt-2">Please try another pattern</p>
            </div>
          )}
          
          {/* もっと読み込むボタン */}
          {!loading && memos.length > 0 && hasMore && (
            <div className="flex items-center justify-center py-8">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 mt-4 bg-blue-600 text-xs text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>more Load</span>
                  </>
                )}
              </button>
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