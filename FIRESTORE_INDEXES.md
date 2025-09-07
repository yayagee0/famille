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

### 3. Daily Polls Collection

**Collection**: `daily_polls`
**Fields**:

- `familyId` (Ascending)
- `createdAt` (Ascending)
- `isClosed` (Ascending)

**Query Path**: Used for finding today's active polls

```javascript
query(
	collection(db, 'daily_polls'),
	where('familyId', '==', familyId),
	where('createdAt', '>=', today),
	where('createdAt', '<', tomorrow),
	where('isClosed', '==', false)
);
```

### 4. Analytics Collection

**Collection**: `analytics`
**Fields**:

- `familyId` (Ascending)
- `date` (Descending)

**Query Path**: Used for retrieving analytics by date range

```javascript
query(
	collection(db, 'analytics'),
	where('familyId', '==', familyId),
	orderBy('date', 'desc'),
	limit(30)
);
```

### 5. User Nudges Collection

**Collection**: `users/{uid}/nudges`
**Fields**:

- `createdAt` (Descending)
- `readAt` (Ascending)

**Query Path**: Used for finding today's nudges and unread nudges

```javascript
query(
	collection(db, 'users', userId, 'nudges'),
	where('createdAt', '>=', today),
	where('createdAt', '<', tomorrow),
	orderBy('createdAt', 'desc')
);
```

### 6. User Feedback Collection

**Collection**: `users/{uid}/feedback`
**Fields**:

- `isPersistent` (Ascending)
- `answeredAt` (Ascending)
- `createdAt` (Descending)

**Query Path**: Used for finding pending feedback

```javascript
query(
	collection(db, 'users', userId, 'feedback'),
	where('isPersistent', '==', true),
	where('answeredAt', '==', null),
	orderBy('createdAt', 'desc')
);
```

### 7. User Badges Collection

**Collection**: `users/{uid}/badges`
**Fields**:

- `earnedAt` (Descending)
- `notificationSent` (Ascending)

**Query Path**: Used for recent badge display and notifications

```javascript
query(
	collection(db, 'users', userId, 'badges'),
	orderBy('earnedAt', 'desc'),
	limit(10)
);
```

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
