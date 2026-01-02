# AtCoder Memo

A web application for managing and sharing competitive programming memos, specifically designed for AtCoder users. Create, organize, and share your problem-solving notes with the community.

## Overview

AtCoder Memo is a comprehensive memo management platform that allows users to:
- Create and manage personal memos for competitive programming problems
- Share memos publicly with other users
- Organize memos by categories (Algorithm, Data Structure, Math, Others)
- Search and filter memos by title, tags, and categories
- Mark favorite memos for quick access
- View other users' public memos for learning and reference
- Automatically save drafts while editing to prevent data loss

## Tech Stack

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **Supabase**
- **Clerk**

## Usage

### Account Setup

1. **Sign Up**: Create an account using Clerk authentication
2. **Onboarding**: Set up your AtCoder profile:
   - AtCoder username
   - Favorite programming language
   - AtCoder rating

### Creating Memos

1. Navigate to **My Memo** page
2. Click **New Memo** button
3. Fill in the memo details:
   - **Title** (required): Brief title for your memo
   - **Summary**: Short description or supplementary information
   - **URL**: Link to the problem or related resources
   - **Content**: Detailed explanation, code snippets, or notes
   - **Tags**: Space-separated tags for easy searching (e.g., "dp graph")
   - **Category**: Choose from Algorithm, Data Structure, Math, or Others
   - **Publish**: Toggle to share with the community
   - **Favorite**: Mark as favorite for quick access

4. Click **Create** to save your memo

### Editing Memos

1. Click on any memo in **My Memo** to view details
2. Click **Edit** button
3. Modify the content
4. Click **Edit** to save changes

### Browsing Global Memos

1. Navigate to **Global Memo** page (home page)
2. Browse public memos shared by other users
3. Filter by:
   - **Search by word**: Filter memos by title or subtitle
   - **Search by tags**: Enter space-separated tags to find related memos
   - **Search by creater**: Enter space-separated tags to find related memos
   - **Category**: Select a specific category

4. Click on any memo to view full details including the author's username

### Managing Your Memos

**My Memo Page Features:**
- View all your personal memos
- Filter by **All Memo** or **Favorite Memo**
- Search by word or tags
- Filter by category
- Edit existing memos
- Delete memos

### AtCoder Settings

Update your profile information:
1. Click on your profile icon
2. Select **Manage Account**
3. Navigate to **AtCoder Settings**
4. Update:
   - AtCoder username
   - Favorite programming language
   - AtCoder rating
5. Click **Save**

## Features

- ✅ User authentication with Clerk
- ✅ User profile with AtCoder information
- ✅ Create, read, update, delete memos
- ✅ Public and private memo visibility
- ✅ Category-based organization
- ✅ Tag-based search (multi-tag OR search)
- ✅ Favorite memo marking
