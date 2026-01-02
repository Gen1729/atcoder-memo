'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export const updateProfile = async (formData: FormData) => {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated) {
    return { error: 'No Logged In User' }
  }

  const client = await clerkClient()

  try {
    const atcoderRate = formData.get('atcoderRate')
    const atcoderUsername = formData.get('atcoderUsername')
    const favoriteLanguage = formData.get('favoriteLanguage')
    
    // Clerkのメタデータを更新
    await client.users.updateUser(userId, {
      unsafeMetadata: {
        atcoderUsername: atcoderUsername ? String(atcoderUsername) : undefined,
        favoriteLanguage: favoriteLanguage ? String(favoriteLanguage) : undefined,
        atcoderRate: atcoderRate ? Number(atcoderRate) : undefined,
      },
    })

    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    if(!email){
      return { error : "User Email not found"}
    }

    // Supabaseのprofilesテーブルを更新
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        email: email,
        atcoder_username: atcoderUsername ? String(atcoderUsername) : null,
        favorite_language: favoriteLanguage ? String(favoriteLanguage) : null,
        atcoder_rate: atcoderRate ? Number(atcoderRate) : null,
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Supabase error:', error)
      return { error: 'Failed to update profile in database' }
    }

    return { success: true, message: 'Profile updated successfully' }
  } catch (err) {
    console.error('Update profile error:', err)
    return { error: 'There was an error updating the profile.' }
  }
}
