# Generate Embedding Edge Function

This Supabase Edge Function converts text to vector embeddings using Google's Gemini API.

## Setup

1. **Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

2. **Login to Supabase**:
```bash
supabase login
```

3. **Link to your Supabase project**:
```bash
supabase link --project-ref your-project-ref
```

4. **Set the Gemini API key as a secret**:
```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

To get a Gemini API key:
- Go to https://ai.google.dev/
- Sign in with your Google account
- Navigate to "Get API key" and create a new key

5. **Deploy the Edge Function**:
```bash
supabase functions deploy generate-embedding
```

## Testing

Test the Edge Function locally:
```bash
supabase functions serve generate-embedding --env-file ./supabase/.env.local
```

Then in another terminal:
```bash
curl -X POST 'http://localhost:54321/functions/v1/generate-embedding' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text":"best seafood restaurants in Portland"}'
```

Test the deployed Edge Function:
```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/generate-embedding' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text":"best seafood restaurants in Portland"}'
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
  "embedding": [0.123, -0.456, 0.789, ...]
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

- The function uses Google's `embedding-001` model which produces 768-dimensional vectors
- Maximum text length is 10,000 characters
- The function includes CORS headers for cross-origin requests
- API key is stored securely as a Supabase secret (not in code)
