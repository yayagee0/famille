# AGENTS.md - Engineering Contract

## Project Overview

**Family Hub** is a private, secure family social platform that allows 4 specific family members to share photos, videos, polls, and YouTube links in a protected environment. Built with modern web technologies and strict security controls.

## Technical Stack & Constraints

### Framework & Language

- **SvelteKit 2** with TypeScript (required)
- **Svelte 5** with runes (`$state()`, `$derived()`, `$effect()`)
- **Vite** as build tool with SSR enabled
- **Node.js 18+** runtime requirement

### Styling & UI

- **TailwindCSS v4** with `@tailwindcss/vite` plugin (required)
- **lucide-svelte** for iconography
- **Responsive design** (mobile-first approach)
- **Accessibility** standards (ARIA labels, keyboard navigation)

### State Management

- **Svelte 5 runes only** - no external state management libraries
- Use `$state()` for reactive variables
- Use `$derived()` for computed values
- Use `$effect()` for side effects

### Data & Validation

- **Zod v4** for schema validation
- **Day.js** for date manipulation (with relativeTime plugin)
- **Firebase SDK v10+** for backend services

### Backend Services (Firebase)

- **Firebase Auth** (Google OAuth only)
- **Cloud Firestore** (NoSQL database)
- **Firebase Storage** (file uploads)
- **browser-image-compression** for client-side optimization

## Security Rules & Constraints

### Authentication

- **ONLY Google OAuth** authentication allowed
- **Email allowlist** restricts access to exactly 4 users:
  - `nilezat@gmail.com`
  - `abdessamia.mariem@gmail.com`
  - `yazidgeemail@gmail.com`
  - `yahyageemail@gmail.com`
- **No user registration** - only predefined family members
- **Session persistence** handled by Firebase Auth

### Database Rules (Firestore)

- **Family ID enforcement**: All documents must have `familyId: "ghassan-family"`
- **Read access**: Only allowlisted users can read any data
- **Write access**: Users can only create posts with their own `uid`
- **Update constraints**: Post authors can modify their posts; others can only update `likes` and `comments` arrays
- **Delete access**: Only post authors can delete their own content

### Storage Rules (Firebase Storage)

- **Folder isolation**: Users can only upload to `/avatars/{uid}/` and `/posts/{uid}/`
- **Read access**: All allowlisted users can read uploaded files
- **File validation**: Client-side compression and size limits enforced
- **CORS configuration**: Required for browser uploads

### Application Rules

- **No public routes** except `/login`
- **Automatic redirects**: Unauthenticated users → login, authenticated users → dashboard
- **Route protection**: All routes except login require valid authentication + allowlist verification

## Architecture Constraints

### File Structure (Required)

```
src/
├── lib/
│   ├── firebase.ts         # Firebase configuration & helpers
│   ├── allowlist.ts        # Email validation logic
│   ├── Nav.svelte          # Navigation component
│   └── FeedUpload.svelte   # Post creation component
├── routes/
│   ├── +layout.svelte      # Auth wrapper & navigation
│   ├── +page.svelte        # Root redirect logic
│   ├── login/+page.svelte  # Authentication page
│   ├── dashboard/+page.svelte  # Family statistics
│   ├── feed/+page.svelte   # Social feed
│   └── profile/+page.svelte    # Profile management
└── app.css                 # TailwindCSS imports
```

### Component Patterns

- **Props with TypeScript**: `let { user } = $props<{ user: User }>();`
- **Event dispatching**: Use `createEventDispatcher()` for component communication
- **Error boundaries**: Handle Firebase errors gracefully with user feedback
- **Loading states**: Always provide loading indicators for async operations

### Data Flow

1. **Authentication**: Firebase Auth → Layout → Route Protection
2. **Data fetching**: Components → Firebase SDK → Reactive updates
3. **File uploads**: Client compression → Firebase Storage → Firestore URL reference
4. **Real-time updates**: Firestore listeners → Svelte reactivity

## Development Constraints

### Environment Variables (Required)

```bash
VITE_FB_API_KEY=         # Firebase API key
VITE_FB_AUTH_DOMAIN=     # Firebase auth domain
VITE_FB_PROJECT_ID=      # Firebase project ID
VITE_FB_STORAGE_BUCKET=  # Firebase storage bucket
VITE_FB_APP_ID=          # Firebase app ID
VITE_FB_RETURN_URL=      # OAuth return URL
VITE_FAMILY_ID=          # Family identifier (ghassan-family)
VITE_ALLOWED_EMAILS=     # Comma-separated email list
```

### Build Requirements

- **TypeScript strict mode** enabled
- **ESLint** with Svelte plugin
- **Prettier** for code formatting
- **TailwindCSS** compilation via Vite plugin
- **Bundle optimization** for production builds

### Performance Requirements

- **Image compression**: Max 1MB after compression, 1920px max dimension
- **Lazy loading**: Images in feed should lazy load
- **Bundle splitting**: Automatic code splitting via Vite
- **Caching**: Firebase SDK handles caching automatically

## Feature Constraints

### Post Types (Limited to 5)

1. **Text posts**: Plain text with optional formatting
2. **Photo posts**: Multiple images with compression
3. **Video posts**: Single video file with size limits
4. **YouTube posts**: Embedded YouTube videos via URL
5. **Poll posts**: Question with multiple choice options

### File Upload Limits

- **Images**: 5MB max original, compressed to 1MB, 1920px max
- **Videos**: Browser-dependent, no server-side processing
- **Avatars**: 400x400px, compressed automatically

### UI/UX Constraints

- **Mobile-first**: Primary interface optimized for mobile devices
- **Desktop sidebar**: Fixed navigation on larger screens
- **Color scheme**: Indigo primary with gray neutrals
- **Icons**: Only from lucide-svelte library
- **Animations**: Minimal, focus on performance

## Deployment Constraints

### Supported Platforms

- **Vercel** (recommended for SvelteKit)
- **Firebase Hosting** (requires adapter configuration)
- **Netlify** (with adapter-netlify)
- **Any Node.js hosting** (with adapter-node)

### Firebase Setup Requirements

1. **Firestore rules** must be deployed before app launch
2. **Storage rules** must be deployed before file uploads
3. **CORS configuration** required for storage bucket
4. **Authentication providers** configured in Firebase Console

### Environment Configuration

- **Production**: All environment variables via platform settings
- **Development**: Local `.env` file (not committed)
- **Testing**: Firebase emulators (optional)

## Security Audit Requirements

### Regular Reviews

- **Firestore rules**: Quarterly review of access patterns
- **Storage rules**: Monitor for unauthorized access attempts
- **Email allowlist**: Verify list accuracy during family changes
- **Dependency updates**: Monthly security vulnerability scans

### Monitoring

- **Firebase Auth logs**: Monitor sign-in attempts
- **Firestore usage**: Track read/write patterns
- **Storage usage**: Monitor file upload patterns
- **Error tracking**: Client-side error reporting

## Maintenance Constraints

### Framework Updates

- **SvelteKit**: Stay within major version 2.x
- **Svelte**: Update to latest 5.x versions
- **TailwindCSS**: Stay within major version 4.x
- **Firebase**: Update to latest v10+ versions

### Code Quality

- **TypeScript strict**: No `any` types allowed
- **ESLint rules**: All warnings must be addressed
- **Prettier formatting**: Automatic formatting on save
- **Component testing**: Manual testing of all user flows

### Backup Strategy

- **Firestore**: Automated daily backups via Firebase
- **Storage**: Files stored with redundancy
- **Code**: Git repository with protected main branch
- **Configuration**: Environment variables documented

## Change Management

### Adding New Features

1. Must not break existing security constraints
2. Must follow established architectural patterns
3. Must include proper TypeScript types
4. Must handle loading and error states
5. Must work on both mobile and desktop

### Modifying Authentication

- **Email allowlist changes**: Update environment variable only
- **Provider changes**: Not allowed (Google OAuth only)
- **Session management**: Use Firebase Auth defaults only

### Database Schema Changes

- **New collections**: Must include `familyId` field
- **Field additions**: Must be optional for backward compatibility
- **Index management**: Monitor Firestore console for required indexes

This engineering contract ensures consistent development practices and maintains the security and performance requirements of the Family Hub platform.
