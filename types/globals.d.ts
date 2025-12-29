export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean
    }
  }

  // ユーザーのpublicMetadata型定義
  interface UserPublicMetadata {
    onboardingComplete?: boolean
  }

  // ユーザーのunsafeMetadata型定義（クライアント側で編集可能）
  interface UserUnsafeMetadata {
    atcoderUsername?: string
    favoriteLanguage?: string
    atcoderRate?: number
  }
}