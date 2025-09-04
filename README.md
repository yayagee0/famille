# Family Hub

A private, secure family social platform built with SvelteKit 2, TypeScript, and Firebase. Share photos, videos, polls, and YouTube links with your family members in a protected environment.

## 🚀 Features

- **Secure Authentication**: Google OAuth with email allowlist restriction
- **Multi-format Posts**: Share text, photos, videos, YouTube links, and polls
- **Real-time Updates**: Live feed with likes and comments
- **Image Compression**: Automatic image optimization using browser-image-compression
- **Photo Gallery**: Dedicated gallery page with lightbox modal for all family photos
- **Daily Ayah Widget**: Rotates Quranic verses daily on the dashboard
- **Daily Mood Check-in**: Family members share their daily mood with emojis
- **Birthday Celebrations**: Smart birthday widget with age countdown and confetti animations
- **Age Playground**: Interactive age simulator with clickable family member avatars
- **Dream Builder**: Explore careers with role-based storytelling and progress tracking
- **Family Highlights**: Dashboard shows recent family activity summaries
- **Smart Poll Voting**: Prevent double-voting with vote removal/addition logic
- **Unified Schema**: Clean separation with `authorUid` references and user enrichment
- **Profile Sync**: Updates both Firebase Auth and Firestore user documents
- **Responsive Design**: Mobile-first design with Inter font and rounded modern UI
- **Kid-Friendly Interface**: Colorful gradients, emojis, and animations throughout
- **Null Safety**: Comprehensive checks for user references throughout the app

## 🛠 Tech Stack

- **Framework**: SvelteKit 2 with TypeScript
- **Styling**: TailwindCSS v4 with @tailwindcss/vite, Inter & Amiri fonts
- **Icons**: lucide-svelte
- **State Management**: Svelte 5 `$state()` runes
- **Validation**: Zod v4 with comprehensive schemas
- **Date Handling**: Day.js with relative time
- **Authentication**: Firebase Auth (Google OAuth only)
- **Database**: Cloud Firestore with unified schema
- **Storage**: Firebase Storage
- **Image Processing**: browser-image-compression
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js 20+ and npm
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
   Create a `.env` file with the following variables:

   ```bash
   # Firebase Configuration
   VITE_FB_API_KEY=your_firebase_api_key
   VITE_FB_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FB_PROJECT_ID=your_firebase_project_id
   VITE_FB_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FB_APP_ID=your_firebase_app_id
   VITE_FB_RETURN_URL=http://localhost:5173

   # App Configuration
   VITE_FAMILY_ID=your_family_identifier
   VITE_ALLOWED_EMAILS=email1@example.com,email2@example.com,email3@example.com,email4@example.com

   # Family Birthdays (JSON format)
   VITE_BIRTHDAYS={"email1@example.com":"1990-01-01","email2@example.com":"1985-05-15","email3@example.com":"2010-03-10","email4@example.com":"2015-08-20"}
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
   gsutil cors set cors.json gs://your_storage_bucket_name
   ```

## 🏃‍♂️ Development

1. **Start the development server**:

   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to `http://localhost:5173`

3. **Sign in** with one of the allowed Google accounts as configured in your environment variables

## 🏗 Building

1. **Build for production**:

   ```bash
   npm run build
   ```

2. **Preview the production build**:
   ```bash
   npm run preview
   ```

## 🧪 Testing

### Unit Tests

Run component and utility function tests using Vitest:

```bash
# Run tests once
npm run test:run

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui
```

### End-to-End Tests

Run E2E tests using Playwright:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug
```

### Test Structure

- **Unit tests**: Located in `src/tests/` using Vitest with jsdom environment
- **E2E tests**: Located in `tests/e2e/` using Playwright
- **Test configuration**: 
  - `vitest.config.ts` for unit tests
  - `playwright.config.ts` for E2E tests

### Continuous Integration

- Unit tests run on all pushes and pull requests
- E2E tests run on pushes to main and pull requests
- Test artifacts are uploaded on failures for debugging

## 🔒 Security

### Authentication

- Only allows Google OAuth authentication
- Email allowlist restricts access to specific family members configured in environment variables
- Firebase Auth handles all authentication logic

### Database Rules

- Firestore rules enforce `familyId` matching your configured family ID
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

## 📊 Unified Firebase Schema

### Posts Collection (`/posts/{postId}`)

```typescript
{
  authorUid: string;           // References users/{uid} - unified approach
  familyId: string;            // Your configured family identifier
  kind: "text" | "photo" | "video" | "youtube" | "poll";
  text: string;                // Post content
  createdAt: Timestamp;        // Server timestamp
  likes: string[];             // Array of user UIDs
  comments: Comment[];         // Array of comment objects

  // Media fields (optional)
  imagePath?: string;          // Single image URL
  imagePaths?: string[];       // Multiple image URLs
  videoPath?: string;          // Single video URL
  youtubeId?: string;          // YouTube video ID

  // Poll fields (optional)
  poll?: {
    title: string;
    options: Array<{
      text: string;
      votes: string[];          // Array of user UIDs who voted
    }>;
  };
}
```

### Users Collection (`/users/{uid}`)

```typescript
{
  uid: string;                 // Firebase Auth UID
  displayName: string | null;  // User's display name
  email: string;               // User's email
  avatarUrl?: string | null;   // Profile picture URL
  photoURL?: string | null;    // Alias for avatarUrl (Firebase Auth compatibility)
  createdAt?: Timestamp;       // Account creation
  lastLoginAt?: Timestamp;     // Last sign-in time
  lastUpdatedAt?: Timestamp;   // Profile update time
}
```

### Schema Features

- **Author Enrichment**: Posts store only `authorUid`, author data retrieved from `users/{uid}`
- **Zod Validation**: All schemas validated with discriminated unions
- **Null Safety**: Comprehensive null checks throughout components
- **Real-time Updates**: Firestore listeners with automatic author enrichment

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

Update the Firebase configuration in `.env` with your own project details.

### Family ID

The `VITE_FAMILY_ID` should be set to your family identifier and must match the enforcement in Firestore rules.

### Birthdays Configuration

Family member birthdays are configured in the `VITE_BIRTHDAYS` environment variable as a JSON map with email keys and ISO date values.

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

This is a private family project template. Feel free to fork and adapt for your own family's needs.

## 📄 License

MIT License - Feel free to use this template for your own family projects.
