# Fix Storage URLs Script

This script fixes storage URLs in the Firestore database by converting raw storage paths to proper signed download URLs.

## Problem

Some documents in the database may contain raw storage paths (e.g., `posts/user123/image.jpg`) instead of proper Firebase Storage download URLs. This script identifies and fixes these issues.

## What it does

1. **Connects to Firebase** using the environment configuration
2. **Scans the `users` collection** and checks `avatarUrl` fields
3. **Scans the `posts` collection** and checks `imagePath`, `imagePaths`, and `videoPath` fields
4. **Identifies raw paths** that start with `posts/`
5. **Converts them to proper download URLs** using `getDownloadURL()`
6. **Updates the documents** in Firestore with the corrected URLs
7. **Logs all changes** for review

## Usage

```bash
# Run the script
npx tsx scripts/fix-storage-urls.ts
```

## Requirements

- Node.js 18+
- Proper Firebase configuration in `.env` file
- Network access to Firebase services
- Valid Firebase credentials

## Environment Variables

The script uses the same environment variables as the main application:

- `VITE_FB_API_KEY`
- `VITE_FB_AUTH_DOMAIN`
- `VITE_FB_PROJECT_ID`
- `VITE_FB_STORAGE_BUCKET`
- `VITE_FB_APP_ID`

## Safety Features

- **Read-only first**: The script first reads all documents to identify issues
- **Error handling**: If a path cannot be converted, the original value is preserved
- **Detailed logging**: All changes are logged for review
- **No destructive changes**: Only updates fields that need fixing

## Example Output

```
🚀 Starting storage URL fix script...
📁 Project: familyg-719f2
🗄️  Storage bucket: familyg-719f2.appspot.com

🔍 Processing users collection...
✅ Updated user abc123: posts/abc123/avatar.jpg → https://firebasestorage.googleapis.com/...
📊 Users collection: 1 documents updated

🔍 Processing posts collection...
🖼️  Fixed imagePath for post def456: posts/abc123/photo.jpg → https://firebasestorage.googleapis.com/...
🎥 Fixed videoPath for post ghi789: posts/abc123/video.mp4 → https://firebasestorage.googleapis.com/...
📊 Posts collection: 2 documents updated

✅ Fix completed.
```

## Notes

- This is a **one-time script** intended to fix existing data
- New uploads should already use proper download URLs
- The script is **safe to run multiple times** - it will only update documents that need fixing
- Make sure you have proper Firebase authentication and permissions before running
