'use client'

import { UserButton } from '@clerk/nextjs'
import { AtCoderSettings } from './AtCoderSettings'

export function CustomUserButton() {
  return (
    <UserButton>
      <UserButton.UserProfilePage 
        label="AtCoder Settings" 
        url="atcoder"
        labelIcon={<span>⚙️</span>}
      >
        <AtCoderSettings />
      </UserButton.UserProfilePage>
    </UserButton>
  )
}
