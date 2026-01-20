import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  console.log('=== Webhook received ===')
  
  // Webhook署名検証のための環境変数
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not defined')
    return new Response('Server configuration error', {
      status: 500,
    })
  }

  // Svixヘッダーを取得
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  console.log('Headers:', { svix_id, svix_timestamp, svix_signature })

  // ヘッダーが存在しない場合はエラー
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers')
    return new Response('Error: Missing svix headers', {
      status: 400,
    })
  }

  // リクエストボディを取得（生のテキストとして）
  const body = await req.text()
  console.log('Body received, length:', body.length)

  // Webhookインスタンスを作成して検証
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
    console.log('Webhook verified successfully, event type:', evt.type)
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Error: Webhook verification failed', {
      status: 400,
    })
  }

  // Supabaseクライアントを作成（Service Roleキーを使用）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing')
    return new Response('Server configuration error', {
      status: 500,
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // イベントタイプに応じた処理
  const eventType = evt.type

  switch (eventType) {
    case 'user.deleted':
      // ユーザー削除時の処理
      const deletedUserId = evt.data.id
      
      console.log(`User deleted: ${deletedUserId}`)

      try {
        //profilesテーブルから削除
        console.log(`Deleting profile for user: ${deletedUserId}`)
        const { error: profilesError } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', deletedUserId)

        if (profilesError) {
          console.error('Error deleting profile:', profilesError)
          return new Response('Error: Failed to delete profile', {
            status: 500,
          })
        } else {
          console.log('Profile deleted successfully')
        }

        console.log(`Successfully deleted data for user: ${deletedUserId}`)
      } catch (error) {
        console.error('Error in user deletion process:', error)
        return new Response('Error: Failed to delete user data', {
          status: 500,
        })
      }
      break

    case 'user.updated':
      // ユーザー情報更新時の処理（メールアドレスとプロフィール画像の変更を含む）
      const updatedUserId = evt.data.id
      const primaryEmail = evt.data.email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id
      )
      const imageUrl = evt.data.image_url

      if (primaryEmail || imageUrl) {
        console.log(`User updated: ${updatedUserId}, new email: ${primaryEmail?.email_address}, image: ${imageUrl}`)

        try {
          // profilesテーブルのメールアドレスとプロフィール画像を更新
          const updateData: { email?: string; icon?: string } = {}
          
          if (primaryEmail) {
            updateData.email = primaryEmail.email_address
          }
          
          if (imageUrl) {
            updateData.icon = imageUrl
          }

          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', updatedUserId)

          if (updateError) {
            console.error('Error updating profile:', updateError)
            return new Response('Error: Failed to update profile', {
              status: 500,
            })
          }

          console.log(`Successfully updated profile for user: ${updatedUserId}`)
        } catch (error) {
          console.error('Error in user update process:', error)
          return new Response('Error: Failed to update user data', {
            status: 500,
          })
        }
      } else {
        console.log(`No primary email or image found for user: ${updatedUserId}`)
      }
      break

    default:
      console.log(`Unhandled event type: ${eventType}`)
  }

  return new Response('Webhook processed successfully', { status: 200 })
}
