'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'

interface UserProfile {
  atcoder_username: string
  icon?: string
  favorite_language?: string
  atcoder_rate?: number
}

interface UserProfileModalProps {
  userId: string
  onClose: () => void
}

const rateColor = (rate : number) => {
  if (2800 <= rate) return "(255,0,0)";
  else if (2400 <= rate) return "(255,128,0)";
  else if (2000 <= rate) return "(192,192,0)";
  else if (1600 <= rate) return "(0,0,255)";
  else if (1200 <= rate) return "(0,192,192)";
  else if (800 <= rate) return "(0,128,0)";
  else if (400 <= rate) return "(128,64,0)";
  else return "(128,128,128)";
}

export function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)
      const { data, error } = await client
        .from('profiles')
        .select('atcoder_username, icon, favorite_language, atcoder_rate')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
      } else {
        setProfile(data)
      }
      setLoading(false)
    }

    fetchUserProfile()
  }, [userId])

  // 背景クリックで閉じる
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-gray-500/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative animate-fadeIn">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : profile ? (
          <div className="p-8">
            {/* ユーザーアイコンと名前 */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-24 h-24 mb-4">
                {profile.icon ? (
                  <Image
                    src={profile.icon}
                    alt={profile.atcoder_username}
                    width={96}
                    height={96}
                    className="rounded-full object-cover border-4 border-gray-200 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-4 border-gray-200 shadow-lg">
                    <span className="text-white text-3xl font-bold">
                      {profile.atcoder_username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {profile.atcoder_username}
              </h2>
            </div>

            {/* ユーザー情報 */}
            <div className="space-y-4">
              {/* AtCoder Rate */}
              {profile.atcoder_rate !== undefined && profile.atcoder_rate !== null && (
                <div className="border-b border-gray-200 pb-1">
                  <p className="text-sm text-black mb-1">AtCoder Rating</p>
                  <p className="text-2xl font-bold" style={{ color: `rgb${rateColor(profile.atcoder_rate)}` }}>{profile.atcoder_rate}</p>
                </div>
              )}

              {/* Favorite Language */}
              {profile.favorite_language && (
                <div className="border-b border-gray-200 pb-1">
                  <p className="text-sm text-black mb-1">Favorite Language</p>
                  <p className="text-2xl font-semibold text-black">{profile.favorite_language}</p>
                </div>
              )}

              {/* データがない場合 */}
              {!profile.atcoder_rate && !profile.favorite_language && (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">No additional information available</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500">User not found</p>
          </div>
        )}
      </div>
    </div>
  )
}
