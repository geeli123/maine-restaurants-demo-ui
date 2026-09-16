# Generate Embedding Edge Function

This Supabase Edge Function converts text to vector embeddings using Google's Gemini API, with automatic caching in a Supabase database table (`query_embeddings_cache`) to prevent repeat Google API costs and drastically reduce latency.

## Setup

1. **Run Database Migration for Embedding Cache**:
Run the SQL in `sql/query_embeddings_cache.sql` in your Supabase project's SQL Editor (or via `supabase db push`). This creates:
- The `query_embeddings_cache` table with `vector(768)`
- An index on `query_hash` (SHA-256) for O(1) cache lookups
- Row-Level Security policies allowing the Edge Function service role to manage the cache

2. **Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

3. **Login to Supabase**:
```bash
supabase login
```

4. **Link to your Supabase project**:
```bash
supabase link --project-ref your-project-ref
```

5. **Set the Gemini API key as a secret**:
```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

To get a Gemini API key:
- Go to https://ai.google.dev/
- Sign in with your Google account
- Navigate to "Get API key" and create a new key

6. **Deploy the Edge Function**:
```bash
supabase functions deploy generate-embedding
```

## How Caching Works

1. When a request comes in with `{ text }`, the text is trimmed, lowercased, and hashed with SHA-256.
2. The function queries `query_embeddings_cache` for `query_hash`.
3. **Cache Hit**:
   - Returns `{ embedding: [...], cached: true }`
   - Increments `hit_count` and updates `last_accessed_at` in the background.
   - **Cost**: $0 (no call to Google Gemini API).
   - **Latency**: ~20-40ms instead of ~500ms.
4. **Cache Miss**:
   - Calls Gemini Embedding API (`gemini-embedding-001`).
   - Inserts row into `query_embeddings_cache`.
   - Returns `{ embedding: [...], cached: false }`.

## Testing

Test the deployed Edge Function:
```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/generate-embedding' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text":"best seafood restaurants in Portland"}'
```

First call response:
```json
{
  "embedding": [0.123, -0.456, ...],
  "cached": false
}
```

Subsequent call response (same query):
```json
{
  "embedding": [0.123, -0.456, ...],
  "cached": true
}
```

## API

**Endpoint**: `POST /functions/v1/generate-embedding`

**Request Body**:
```json
{
  "text": "your search query here"
}
```

**Response** (Success):
```json
{
  "embedding": [0.123, -0.456, 0.789, ...],
  "cached": true
}
```

**Response** (Error):
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## Notes

- Uses Google's `gemini-embedding-001` model (768-dimensional vectors)
- Maximum text length is 10,000 characters
- Uses Web Crypto API (`crypto.subtle`) for hashing
- If database cache lookup fails, it automatically falls back to Gemini API without failing the user's search
- In-memory session caching is also enabled in the frontend client (`embeddingService.js`)
