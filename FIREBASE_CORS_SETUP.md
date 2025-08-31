# Firebase Storage CORS Configuration

This document provides the necessary commands to configure CORS for the Firebase Storage bucket.

## Prerequisites

1. Install Google Cloud SDK (gcloud)
2. Authenticate with your Google Cloud account
3. Set your project ID

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## CORS Configuration Commands

### 1. Set CORS Configuration

Apply the CORS configuration from `cors.json`:

```bash
gsutil cors set cors.json gs://familyg-719f2.appspot.com
```

**Note**: Replace `familyg-719f2.appspot.com` with your actual Firebase Storage bucket name if different.

### 2. Verify CORS Configuration

Check the current CORS settings:

```bash
gsutil cors get gs://familyg-719f2.appspot.com
```

### 3. Expected CORS Output

The verification command should return:

```json
[
	{
		"origin": [
			"http://localhost:5173",
			"https://famille-nine.vercel.app",
			"https://familyg-719f2.appspot.com"
		],
		"method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
		"header": ["Content-Type", "Authorization", "X-Requested-With"],
		"maxAgeSeconds": 3600
	}
]
```

## CORS Configuration Details

- **Origins**:
  - `http://localhost:5173` - Local development server
  - `https://famille-nine.vercel.app` - Production deployment
  - `https://familyg-719f2.appspot.com` - Firebase Storage bucket domain
- **Methods**: `GET`, `POST`, `PUT`, `DELETE`, `HEAD`, `OPTIONS`
- **Headers**: `Content-Type`, `Authorization`, `X-Requested-With`
- **Max Age**: 3600 seconds (1 hour)

## Troubleshooting

If you encounter CORS errors:

1. Verify your bucket name is correct
2. Ensure you have proper permissions to modify bucket settings
3. Check that the origins match exactly (including protocol and port)
4. Wait a few minutes after applying CORS settings for changes to propagate
5. Ensure `getDownloadURL()` is used instead of manual URL construction
6. Verify file paths exist in Firebase Storage before accessing them

## Alternative Method: Firebase Console

You can also set CORS through the Firebase Console:

1. Go to Firebase Console → Storage
2. Click on the Rules tab
3. Update the CORS settings in the rules section

Note: The gsutil method is recommended for programmatic configuration.
