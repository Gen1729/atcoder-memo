'use client'
import { useState } from 'react'
import { useSession, useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function Create(){
  const [title,setTitle] = useState<string>("");
  const [subtitle,setSubtitle] = useState<string>("");
  const [url,setUrl] = useState<string>("");
  const [content,setContent] = useState<string>("");
  const [publish,setPublish] = useState<boolean>(false);
  const [tags,setTags] = useState<string>("");
  const [category,setCategory] = useState<string>("");

  const router = useRouter();
  const { user } = useUser()
  // The `useSession()` hook is used to get the Clerk session object
  // The session object is used to get the Clerk session token
  const { session } = useSession()

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

  // Create a `client` object for accessing Supabase data using the Clerk token
  const client = createClerkSupabaseClient()

  async function createMemo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Insert memo into the database
    const { error } = await client.from('memos').insert({
      title,
      subtitle,
      url,
      content,
      publish,
      tags,
      category
    })
    
    if (error) {
      console.error('Error creating memo:', error);
      alert(`Error: ${error.message}`);
      return;
    }
    
    router.push('/individual');
  }

  return (
    <div>
      <form onSubmit={createMemo}>
        <input type="text" name="title" onChange={(e) => setTitle(e.target.value)} value={title}/>
        <input type="text" name="subtitle" onChange={(e) => setSubtitle(e.target.value)} value={subtitle}/>
        <input type="text" name="url" onChange={(e) => setUrl(e.target.value)} value={url}/>
        <input type="textarea" name="content" onChange={(e) => setContent(e.target.value)} value={content}/>
        <input type="checkbox" name="publish" onChange={(e) => setPublish(e.target.checked)} checked={publish}/>
        <input type="text" name="tags" onChange={(e) => setTags(e.target.value)} value={tags}/>
        <input type="text" name="category" onChange={(e) => setCategory(e.target.value)} value={category}/>
        <button type="submit">Create</button>
      </form>
      
    </div>
  )
}