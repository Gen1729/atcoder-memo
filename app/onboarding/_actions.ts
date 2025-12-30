'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export const completeOnboarding = async (formData: FormData) => {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated) {
    return { message: 'No Logged In User' }
  }

  const client = await clerkClient()

  try {
    const atcoderRate = formData.get('atcoderRate')
    const atcoderUsername = formData.get('atcoderUsername')
    const favoriteLanguage = formData.get('favoriteLanguage')
    
    // Clerkのメタデータを更新
    const res = await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
      },
      unsafeMetadata: {
        atcoderUsername: atcoderUsername ? String(atcoderUsername) : undefined,
        favoriteLanguage: favoriteLanguage ? String(favoriteLanguage) : undefined,
        atcoderRate: atcoderRate ? Number(atcoderRate) : undefined,
      },
    })

    // ユーザー情報を取得（emailを含む）
    const user = await client.users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress

    if(!email){
      return { error : "User Email not found"}
    }

    return { message: res.publicMetadata }
  } catch (err) {
    console.error('Onboarding error:', err)
    return { error: 'There was an error updating the user metadata.' }
  }
}