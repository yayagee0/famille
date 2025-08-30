# Family Hub

A private, secure family social platform built with SvelteKit 2, TypeScript, and Firebase. Share photos, videos, polls, and YouTube links with your family members in a protected environment.

## 🚀 Features

- **Secure Authentication**: Google OAuth with email allowlist restriction
- **Multi-format Posts**: Share text, photos, videos, YouTube links, and polls
- **Real-time Updates**: Live feed with likes and comments
- **Image Compression**: Automatic image optimization using browser-image-compression
- **Responsive Design**: Mobile-first design with TailwindCSS v4
- **Profile Management**: Avatar upload and display name customization
- **Dashboard**: Family activity overview and statistics

## 🛠 Tech Stack

- **Framework**: SvelteKit 2 with TypeScript
- **Styling**: TailwindCSS v4 with @tailwindcss/vite
- **Icons**: lucide-svelte
- **State Management**: Svelte 5 `$state()` runes
- **Validation**: Zod v4
- **Date Handling**: Day.js with relative time
- **Authentication**: Firebase Auth (Google OAuth only)
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage
- **Image Processing**: browser-image-compression
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase project with the following services enabled:
  - Authentication (Google provider)
  - Cloud Firestore
  - Cloud Storage

## 🔧 Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd famille
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment variables**:
   The `.env` file is already configured with the following variables:

   ```env
   VITE_FB_API_KEY=AIzaSyD3Ornf-I5YtpS4fVQtwJs5fNxwJxSglg4
   VITE_FB_AUTH_DOMAIN=familyg-719f2.firebaseapp.com
   VITE_FB_PROJECT_ID=familyg-719f2
   VITE_FB_STORAGE_BUCKET=familyg-719f2.appspot.com
   VITE_FB_APP_ID=1:759733772159:web:6f3d295c9066dafcf0444a
   VITE_FB_RETURN_URL=http://localhost:5173

   VITE_FAMILY_ID=ghassan-family
   VITE_ALLOWED_EMAILS=nilezat@gmail.com,abdessamia.mariem@gmail.com,yazidgeemail@gmail.com,yahyageemail@gmail.com
   ```

4. **Deploy Firebase rules** (optional for development):

   ```bash
   # Install Firebase CLI if not already installed
   npm install -g firebase-tools

   # Login to Firebase
   firebase login

   # Initialize Firebase in your project
   firebase init

   # Deploy Firestore rules
   firebase deploy --only firestore:rules

   # Deploy Storage rules
   firebase deploy --only storage:rules

   # Configure CORS for Storage
   gsutil cors set cors.json gs://familyg-719f2.appspot.com
   ```

## 🏃‍♂️ Development

1. **Start the development server**:

   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to `http://localhost:5173`

3. **Sign in** with one of the allowed Google accounts:
   - nilezat@gmail.com
   - abdessamia.mariem@gmail.com
   - yazidgeemail@gmail.com
   - yahyageemail@gmail.com

## 🏗 Building

1. **Build for production**:

   ```bash
   npm run build
   ```

2. **Preview the production build**:
   ```bash
   npm run preview
   ```

## 🔒 Security

### Authentication

- Only allows Google OAuth authentication
- Email allowlist restricts access to 4 specific family members
- Firebase Auth handles all authentication logic

### Database Rules

- Firestore rules enforce `familyId` matching "ghassan-family"
- Users can only create posts with their own `uid`
- Read access limited to allowlisted users
- Update permissions restricted to post authors (except likes/comments)

### Storage Rules

- Users can only upload to their own folders
- Read access limited to allowlisted users
- Automatic file validation and compression

## 📱 Routes

- `/` - Root route (redirects to dashboard or login)
- `/login` - Google OAuth authentication
- `/dashboard` - Family activity overview and statistics
- `/feed` - Multi-format family feed with post creation
- `/profile` - Profile management and avatar upload

## 🧩 Core Components

### `src/lib/Nav.svelte`

Responsive navigation with sidebar (desktop) and bottom navigation (mobile).

### `src/lib/FeedUpload.svelte`

Multi-format post composer supporting:

- Text posts
- Photo uploads (with compression)
- Video uploads
- YouTube link sharing
- Poll creation

### `src/lib/firebase.ts`

Firebase configuration and initialization with environment variable support.

### `src/lib/allowlist.ts`

Email allowlist validation for family member access control.

## 🎨 Styling

- **TailwindCSS v4** with modern CSS features
- **Mobile-first** responsive design
- **Consistent color scheme** with indigo primary colors
- **Accessible** design with proper ARIA labels and keyboard navigation

## 📊 Firebase Collections

### Posts Collection (`/posts/{postId}`)

```typescript
{
  id: string
  type: 'text' | 'photo' | 'video' | 'youtube' | 'poll'
  content: string
  author: {
    uid: string
    displayName: string
    photoURL: string | null
    email: string
  }
  imageUrls?: string[]  // for photo posts
  videoUrls?: string[]  // for video posts
  youtubeUrl?: string   // for youtube posts
  poll?: {              // for poll posts
    question: string
    options: Array<{
      text: string
      votes: number
    }>
  }
  likes: string[]       // array of user UIDs
  comments: any[]       // future enhancement
  timestamp: Timestamp
  familyId: string      // always "ghassan-family"
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

### Firebase Hosting

1. **Install Firebase CLI**:

   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase Hosting**:

   ```bash
   firebase init hosting
   ```

3. **Build and deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Other Platforms

The app is built as a standard SvelteKit application and can be deployed to:

- Netlify
- Railway
- DigitalOcean App Platform
- Any Node.js hosting provider

## 🔧 Configuration

### Email Allowlist

To modify the allowed family members, update the `VITE_ALLOWED_EMAILS` environment variable with comma-separated email addresses.

### Firebase Configuration

Update the Firebase configuration in `.env` with your own project details if needed.

### Family ID

The `VITE_FAMILY_ID` is set to "ghassan-family" and enforced in Firestore rules.

## 🐛 Troubleshooting

### Authentication Issues

- Ensure Google OAuth is properly configured in Firebase Console
- Verify the allowed emails are correct in the environment variables
- Check that the Firebase configuration is correct

### Upload Issues

- Verify Firebase Storage rules are deployed
- Ensure CORS is configured for the storage bucket
- Check that file sizes are within limits (5MB for images)

### Build Issues

- Ensure all dependencies are installed: `npm install`
- Clear the build cache: `rm -rf .svelte-kit && npm run build`
- Check for TypeScript errors: `npm run check`

## 🤝 Contributing

This is a private family project. For feature requests or bug reports, please create an issue in the repository.

## 📄 License

Private family project - All rights reserved.
