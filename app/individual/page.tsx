'use client'
import { Suspense, useEffect, useState, useMemo } from 'react'
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
  publish?: boolean;
  tags?: string;
  category: string;
  favorite: boolean;
  created_at?: string;
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
  const [memoType, setMemoType] = useState<"all" | "memo" | "question">("all");
  const { user } = useUser();
  const { session } = useSession();
  
  // 検索クエリをURLパラメータから取得
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [tagQuery, setTagQuery] = useState<string>(searchParams.get('tag') || '');
  
  // ページネーション用のstate
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 9; // 3x3のグリッド
  
  // ソート順のstate (true: 降順, false: 昇順)
  const [isDescending, setIsDescending] = useState<boolean>(true);

  const filteredMemos = useMemo(() => {
    const filtered = memos.filter((memo) => {
      const favoriteMatch = !isFavorite || memo.favorite;
      
      const categoryMatch = category === "all" || memo.category === category;
      
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
    });
    
    // created_atでソート
    return filtered.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return isDescending ? dateB - dateA : dateA - dateB;
    });
  },[memos, searchQuery, tagQuery, category, isFavorite, isDescending])

  const totalPage = useMemo(() => {
    return Math.ceil(filteredMemos.length / ITEMS_PER_PAGE);
  }, [filteredMemos.length, ITEMS_PER_PAGE]);

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
    setCurrentPage(1); // 検索時は1ページ目に戻る
  };

  const handleTagChange = (value: string) => {
    setTagQuery(value);
    updateSearchParams(searchQuery, value);
    setCurrentPage(1); // タグ検索時は1ページ目に戻る
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

  useEffect(() => {
    if (!user || !session) return;

    async function loadMemos() {
      setLoading(true);
      const { data, error } = await client
        .from('memos')
        .select('id, title, subtitle, publish, tags, category, favorite, created_at')
        .eq('user_id', user!.id)
      
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
          <div className="relative">
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
        </div>

        {/* Menu Section */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            <button 
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${!isFavorite ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => {setIsFavorite(false); setCurrentPage(1);}}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              All
            </button>
            
            <button
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${isFavorite ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => {setIsFavorite(true); setCurrentPage(1);}}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Favorite
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
            <button 
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${memoType == "all" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => {setMemoType("all"); setCurrentPage(1);}}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              All
            </button>
            <button 
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${memoType == "memo" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => {setMemoType("memo"); setCurrentPage(1);}}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Memo
            </button>
            <button
              className={`w-full flex items-center px-4 py-2.5 text-sm font-medium ${memoType == "question" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"} rounded-lg transition-colors`}
              onClick={() => {setMemoType("question"); setCurrentPage(1);}}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Question
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              category
            </h3>
            <div className="space-y-1">
              {categoryNum && Object.keys(categoryNum).map((key) => (
                <button 
                  key={key}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 ${key==category ? "bg-blue-100" : "hover:bg-gray-100"} rounded-lg transition-colors`}
                  onClick={() => {setCategory(key); setCurrentPage(1);}}
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
            <p className="text-sm text-gray-500 mt-1">{categoryNum?.all || 0} memos</p>
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
        <div className="flex-1 overflow-y-auto px-8 py-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!loading && (() => {
              const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
              const endIndex = startIndex + ITEMS_PER_PAGE;
              const paginatedMemos = filteredMemos.slice(startIndex, endIndex);
              
              return paginatedMemos.map((memo) => (
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
              ));
            })()}
          </div>

          {loading && (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Loading...</p>
            </div>
          )}

          {!loading && 
            (memos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No memo is here</p>
                <p className="text-gray-400 text-sm mt-2">Let&apos;s create new memo</p>
              </div>
            ):(
              (filteredMemos.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg">No memo is found</p>
                  <p className="text-gray-400 text-sm mt-2">Please try another pattern</p>
                </div>
              ))
            )
          )}
        </div>

        {/* ページネーションコントロール - 画面下部に固定 */}
        {!loading && totalPage > 0 && (
          <div className="fixed bottom-0 left-80 right-0 bg-white border-t border-gray-200 py-4 px-8 shadow-lg">
            <div className="flex items-center justify-between">
              {/* ソート順トグル - 左端 */}
              <button
                onClick={() => setIsDescending(!isDescending)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-27"
                title={isDescending ? "Descending order（Newest）" : "Ascending order（Oldest）"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isDescending ? (
                    // 降順アイコン（下向き矢印）
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  ) : (
                    // 昇順アイコン（上向き矢印）
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  )}
                </svg>
                <span>{isDescending ? "Newest" : "Oldest"}</span>
              </button>
              
              {/* ページネーション - 中央 */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  前へ
                </button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPage }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPage, prev + 1))}
                  disabled={currentPage === totalPage}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  次へ
                </button>
              </div>
              
              {/* 右側の空白 - レイアウトバランス用 */}
              <div className="w-[120px]"></div>
            </div>
          </div>
        )}
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