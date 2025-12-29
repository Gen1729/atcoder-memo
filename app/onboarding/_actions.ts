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
    return { message: res.publicMetadata }
  } catch (err) {
    return { error: 'There was an error updating the user metadata.' }
  }
}