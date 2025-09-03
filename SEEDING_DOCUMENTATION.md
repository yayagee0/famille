# Firestore Questions Collection Seeding

## Overview

This document describes the process for populating the Firestore `questions` collection using the `seed-questions.ts` script.

## Seed Script Analysis

The `seed-questions.ts` file contains:

- **40 total questions** across 7 categories:
  - `fun`: 8 questions (favorite color, fruit, cartoon, etc.)
  - `daily`: 6 questions (morning/night person, weekend activities, etc.)
  - `family`: 6 questions (family time, traditions, etc.)
  - `values`: 4 questions (honesty, kindness, etc.)
  - `dreams`: 5 questions (travel, career aspirations, etc.)
  - `hobbies`: 5 questions (drawing, sports, learning, etc.)
  - `personality`: 6 questions (shy/outgoing, what makes you laugh, etc.)

- **Question types**:
  - Multiple choice with predefined options
  - Open-ended text responses
  - Optional "other" field for custom answers

- **Required fields per question**:
  - `text`: The question text
  - `category`: One of the 7 categories above
  - `type`: "multiple-choice" or "open-ended"
  - `sentenceTemplate`: Template for displaying answers (e.g., "🖌️ My favorite color is {answer}.")
  - `options`: Array of choices (for multiple-choice only)
  - `allowOther`: Boolean for custom answers (for multiple-choice only)

## Execution Commands

### Primary Command (as specified in requirements)

```bash
npx ts-node -r dotenv/config seed-questions.ts
```

### Alternative Command (works in Node.js ES modules)

```bash
npx tsx seed-questions.ts
```

## Environment Requirements

The script requires these environment variables (already configured in `.env`):

```env
VITE_FB_API_KEY=AIzaSyD3Ornf-I5YtpS4fVQtwJs5fNxwJxSglg4
VITE_FB_AUTH_DOMAIN=familyg-719f2.firebaseapp.com
VITE_FB_PROJECT_ID=familyg-719f2
VITE_FB_STORAGE_BUCKET=familyg-719f2.firebasestorage.app
VITE_FB_APP_ID=1:759733772159:web:6f3d295c9066dafcf0444a
```

## Expected Output

When successfully executed, the script will:

1. Connect to Firestore using the configured project
2. Add each question to the `questions` collection
3. Add a `createdAt` server timestamp to each question
4. Log progress for each question added
5. Display final success message

**Sample output:**

```
✅ Added: Favorite color?
✅ Added: Favorite fruit?
✅ Added: Favorite cartoon?
...
✅ Added: If you were an animal, which would you be?
🎉 Question bank seeded successfully.
```

## Network Requirements

The script requires:

- Internet connectivity
- Access to `firestore.googleapis.com`
- Firebase project permissions for the configured service account

## Verification

After successful execution, the Firestore `questions` collection should contain 40 documents, each with:

- Auto-generated document ID
- All question fields (text, category, type, etc.)
- Server-generated `createdAt` timestamp

## Troubleshooting

**Common issues:**

1. **Network errors**: Ensure internet access and Firebase services aren't blocked
2. **Permission errors**: Verify Firebase project configuration and authentication
3. **TypeScript errors**: Use `npx tsx` instead of `ts-node` for ES modules
4. **Environment variables**: Ensure `.env` file is present and properly formatted

## Security Note

The questions will be stored in Firestore and accessible according to the existing Firestore security rules, which restrict access to the allowlisted family members only.
