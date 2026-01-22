'use client'
import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image';

interface Profile {
  atcoder_username: string;
  icon?: string;
}

interface Memo {
  id: string;
  user_id: string;
  title: string;
  subtitle?: string;
  tags?: string;
  category: string;
  created_at?: string;
  profiles: Profile | Profile[] | null;
}

function GlobalMemosPage() {
  const router = useRouter();
  // const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [category,setCategory] = useState<string>("all");
  // const [memoType, setMemoType] = useState<"memo" | "question">("memo");
  
  // 検索クエリをURLパラメータから取得
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [tagQuery, setTagQuery] = useState<string>(searchParams.get('tag') || '');
  const [nameQuery, setNameQuery] = useState<string>(searchParams.get('name') || '');
  
  // 無限スクロール用のstate
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null); // カーソル位置
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const ITEMS_PER_PAGE = 9;

  // ソート順のstate (true: 降順, false: 昇順)
  const [isDescending, setIsDescending] = useState<boolean>(true);

  // Create anonymous Supabase client for public memos (no auth required)
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 初回ロードとカテゴリ・ソート順変更時
  useEffect(() => {
    setMemos([]);
    setLastCreatedAt(null);
    setHasMore(true);
    loadMemos(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDescending, category]);

  // 「もっと読み込む」ボタンのハンドラ
  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadMemos(lastCreatedAt, false);
    }
  };

  // 検索入力時のハンドラ
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleTagChange = (value: string) => {
    setTagQuery(value);
  };

  const handleNameChange = (value: string) => {
    setNameQuery(value);
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

  async function loadMemos(cursor: string | null, isInitial: boolean) {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    // nameQueryがある場合はinner join、ない場合は通常のjoin
    const selectClause = nameQuery && nameQuery.trim()
      ? 'id, user_id, title, subtitle, tags, category, created_at, profiles!inner(atcoder_username, icon)'
      : 'id, user_id, title, subtitle, tags, category, created_at, profiles(atcoder_username, icon)';
    
    // Fetch only public memos
    let query = client
      .from('memos')
      .select(selectClause)
      .eq('publish', true);

    //category絞り込み
    if (category != 'all') {
      query = query.eq('category',category);
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

    // nameQueryがある場合
    if (nameQuery && nameQuery.trim()) {
      query = query.ilike('profiles.atcoder_username', `%${nameQuery}%`);
    }

    // カーソルベースのページネーション
    if (cursor) {
      if (isDescending) {
        query = query.lt('created_at', cursor);
      } else {
        query = query.gt('created_at', cursor);
      }
    }

    query = query
      .order('created_at', { ascending: !isDescending })
      .limit(ITEMS_PER_PAGE);

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
        
        // 最後のアイテムのcreated_atを保存
        setLastCreatedAt(data[data.length - 1].created_at || null);
        
        // 取得したデータがITEMS_PER_PAGE未満なら、もうデータがない
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
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Filter by Atcoder Name"
              value={nameQuery}
              onChange={(e) => handleNameChange(e.target.value)}
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
              setLastCreatedAt(null);
              setHasMore(true);
              loadMemos(null, true);
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
          {/* <div className="space-y-1">
            <button 
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${memoType == "memo" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => {setMemoType("memo");}}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Memo
            </button>
            <button
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${memoType == "question" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => {setMemoType("question");}}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Question
            </button>
          </div> */}

          <div>
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
            onClick={() => {router.push('/individual')}}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            My Memo
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Global Memo</h1>
          </div>
          
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
        </header>

        {/* Memos Grid */}
        <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memos.map((memo) => (
                <div
                  key={memo.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow cursor-pointer min-h-[180px] flex flex-col"
                  onClick={() => {router.push(`/display/${memo.id}`)}}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-base my-[2px] font-bold text-gray-900 flex-1 truncate" title={memo.title}>
                      {memo.title}
                    </h2>
                    {memo.category && (
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(memo.category)} flex-shrink-0 ml-2 mt-1.5`} title={memo.category} />
                    )}
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
                  <div className="min-h-[24px] mb-3">
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
                  
                  {/* ユーザー名表示 */}
                  {(() => {
                    const profile = Array.isArray(memo.profiles) 
                    ? memo.profiles[0] 
                    : memo.profiles;
                    const username = profile?.atcoder_username;
                    const icon = profile?.icon;
                    return(
                      <div className="mt-auto pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">by</span>
                          <span className="text-sm text-gray-700 truncate">{username || 'Unknown'}</span>
                          {icon && (
                            <Image 
                              src={icon} 
                              alt={username || 'User'}
                              width={24}
                              height={24}
                              className="rounded-full object-cover"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  )()}
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
      <GlobalMemosPage />
    </Suspense>
  )
}