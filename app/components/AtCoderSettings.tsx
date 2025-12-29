'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'

export function AtCoderSettings() {
  const { user } = useUser()
  const [atcoderUsername, setAtcoderUsername] = useState('')
  const [favoriteLanguage, setFavoriteLanguage] = useState('')
  const [atcoderRate, setAtcoderRate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  // userがロードされたら値を設定
  useEffect(() => {
    if (user?.unsafeMetadata) {
      setAtcoderUsername((user.unsafeMetadata.atcoderUsername as string) || '')
      setFavoriteLanguage((user.unsafeMetadata.favoriteLanguage as string) || '')
      const rate = user.unsafeMetadata.atcoderRate
      setAtcoderRate(rate !== undefined ? String(rate) : '')
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      // unsafeMetadataを使用してクライアント側から更新
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          atcoderUsername,
          favoriteLanguage,
          atcoderRate: atcoderRate ? Number(atcoderRate) : undefined
        },
      })
      setMessage('✓ Saved successfully')
    } catch (error) {
      setMessage('× An error occurred. Please try again.')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div style={{
        borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
        marginBottom: '16px',
      }}>
        <h2 style={{ 
          fontSize: '17px',
          fontWeight: '700',
          margin: '0 0 16px 0',
          color: '#1a1a1a',
          height: '24px'
        }}>
          AtCoder Settings
        </h2>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="atcoder-username" 
            style={{ 
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '0.375rem',
              color: '#030712',
              height: '18px'
            }}
          >
            AtCoder Username
          </label>
          <input
            id="atcoder-username"
            type="text"
            value={atcoderUsername}
            onChange={(e) => setAtcoderUsername(e.target.value)}
            placeholder="your_atcoder_username"
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              outline: 'none',
              transition: 'border-color 0.15s',
              backgroundColor: 'white',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="favorite-language"
            style={{ 
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '0.375rem',
              color: '#030712',
              height: '18px'
            }}
          >
            Favorite Programming Language
          </label>
          <select
            id="favorite-language"
            value={favoriteLanguage}
            onChange={(e) => setFavoriteLanguage(e.target.value)}
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              outline: 'none',
              transition: 'border-color 0.15s',
              backgroundColor: 'white',
              boxSizing: 'border-box',
              cursor: 'pointer'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          >
            <option value="">Select a language</option>
            <option value="Python">Python</option>
            <option value="C++">C++</option>
            <option value="Java">Java</option>
            <option value="JavaScript">JavaScript</option>
            <option value="TypeScript">TypeScript</option>
            <option value="Rust">Rust</option>
            <option value="Go">Go</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label 
            htmlFor="atcoder-rate"
            style={{ 
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              marginBottom: '0.375rem',
              color: '#030712',
              height: '18px'
            }}
          >
            AtCoder Rating
          </label>
          <input
            id="atcoder-rate"
            type="number"
            value={atcoderRate}
            onChange={(e) => setAtcoderRate(e.target.value)}
            placeholder="0"
            min="0"
            style={{
              width: '100%',
              padding: '0.625rem 0.875rem',
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              outline: 'none',
              transition: 'border-color 0.15s',
              backgroundColor: 'white',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
        </div>

        <div style={{ 
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(0, 0, 0, 0.07)',
          marginTop: '2rem'
        }}>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '6px 12px 6px 10px',
              fontSize: '13px',
              fontWeight: '500',
              color: 'black',
              backgroundColor: isLoading ? '#9ca3af' : '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
              minWidth: '80px',
              marginTop: '10px'
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#bbaaffff')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            Save
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            borderRadius: '0.375rem',
            border: message.includes('✓') ? '1px solid #86efac' : '1px solid #fca5a5',
            backgroundColor: message.includes('✓') ? '#f0fdf4' : '#fef2f2',
            color: message.includes('✓') ? '#15803d' : '#b91c1c'
          }}>
            {message}
          </div>
        )}
      </form>
    </div>
  )
}