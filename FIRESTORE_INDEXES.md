# Firestore Index Requirements

The Family Hub app requires the following Firestore indexes to function properly:

## Required Compound Indexes

### 1. Posts Collection

**Collection**: `posts`
**Fields**:

- `familyId` (Ascending)
- `createdAt` (Descending)

**Query Path**: Used in dashboard for recent posts

```javascript
query(
	collection(db, 'posts'),
	where('familyId', '==', familyId),
	orderBy('createdAt', 'desc'),
	limit(5)
);
```

### 2. Photo Posts Collection (for Gallery)

**Collection**: `posts`
**Fields**:

- `familyId` (Ascending)
- `kind` (Ascending)
- `createdAt` (Descending)

**Query Path**: Used in gallery page for photo filtering

```javascript
query(
	collection(db, 'posts'),
	where('familyId', '==', familyId),
	where('kind', '==', 'photo'),
	orderBy('createdAt', 'desc')
);
```

## Index Creation

These indexes will be automatically suggested in the Firebase Console when the queries are first executed. You can also create them manually:

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Add the collection and fields as specified above

## Error Messages

If indexes are missing, you'll see errors like:

- "The query requires an index"
- "Missing or insufficient permissions" (when the real issue is missing indexes)

## Automatic Index Creation

When you first run queries that require these indexes, Firebase will:

1. Show an error in the console with a direct link to create the index
2. Click the link to automatically create the required index
3. Wait for index creation to complete (can take a few minutes)

## Notes

- Single field indexes are created automatically
- Compound indexes (multiple fields) must be created manually or via the suggested links
- Index creation is a one-time setup per Firebase project
