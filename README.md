# Maine Restaurant Search

A React application that enables semantic search for Maine restaurants using AI-powered vector embeddings. Users can search for restaurants using natural language queries, and the app returns relevant results ranked by similarity.

## Features

- **AI-Powered Search**: Uses Google Gemini API to convert search queries into 768-dimensional vector embeddings
- **Semantic Matching**: Performs cosine similarity search against a Supabase database using pgvector
- **Modern UI**: Clean, responsive design with real-time search feedback
- **Advanced Options**: Customizable similarity threshold and result count
- **Rich Results**: Displays restaurant name, location, reviews, ratings, and similarity scores

## Tech Stack

- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL + pgvector extension)
- **Embedding API**: Google Gemini API (embedding-001, 768 dimensions)
- **Backend**: Supabase Edge Functions (serverless)
- **UI Icons**: Lucide React
- **Styling**: Custom CSS with responsive design

## Architecture

```
User Query → Supabase Edge Function → Gemini API → 768-dim Vector
                                                          ↓
React App ← Supabase Database ← Vector Similarity Search ←
```

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase Account** - [Create one here](https://supabase.com)
3. **Google Gemini API Key** - [Get one here](https://ai.google.dev/)
4. **Supabase CLI** - Install globally:
   ```bash
   npm install -g supabase
   ```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd maine-restaurants-frontend
npm install
```

### 2. Configure Supabase

The database schema is already defined in `sql/restaurant_reviews.sql`. Make sure your Supabase project has:
- The `restaurant_reviews` table created
- pgvector extension enabled
- RPC functions `search_restaurant_reviews()` and `hybrid_search_restaurant_reviews()` deployed

### 3. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**How to find these values:**
- Go to your Supabase project dashboard
- Navigate to Settings → API
- Copy the "Project URL" and "anon public" key

### 4. Deploy Supabase Edge Function

The Edge Function securely calls the Gemini API (can't be done from the browser).

**a. Login to Supabase:**
```bash
supabase login
```

**b. Link to your project:**
```bash
supabase link --project-ref your-project-ref
```

**c. Set Gemini API key as a secret:**
```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

**d. Deploy the Edge Function:**
```bash
supabase functions deploy generate-embedding
```

**e. Test the Edge Function:**
```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/generate-embedding' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"text":"best seafood restaurants in Portland"}'
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

1. **Enter a search query** using natural language:
   - "Best seafood restaurants in Portland"
   - "Cozy Italian places with outdoor seating"
   - "Family-friendly restaurants near the waterfront"

2. **Adjust advanced options** (optional):
   - **Similarity Threshold** (0-1): Minimum similarity score to return results
   - **Max Results**: Number of restaurants to display

3. **View results** ranked by relevance with:
   - Restaurant name and location
   - Review excerpt
   - Similarity score (% match)
   - Rating (if available)

## Project Structure

```
maine-restaurants-frontend/
├── supabase/
│   └── functions/
│       └── generate-embedding/
│           ├── index.ts          # Edge Function for Gemini API
│           └── README.md         # Edge Function documentation
├── src/
│   ├── config/
│   │   └── supabase.js          # Supabase client setup
│   ├── services/
│   │   ├── embeddingService.js  # Embedding generation
│   │   └── searchService.js     # Database queries
│   ├── hooks/
│   │   └── useRestaurantSearch.js  # Search state management
│   ├── components/
│   │   ├── SearchBar.jsx        # Search input
│   │   ├── SearchResults.jsx    # Results container
│   │   ├── RestaurantCard.jsx   # Individual result card
│   │   ├── LoadingSpinner.jsx   # Loading UI
│   │   └── ErrorMessage.jsx     # Error UI
│   ├── styles/
│   │   └── App.css              # Main stylesheet
│   ├── App.jsx                  # Root component
│   └── main.jsx                 # Entry point
├── sql/
│   └── restaurant_reviews.sql   # Database schema
├── .env                         # Environment variables (git-ignored)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── vite.config.js               # Vite configuration
└── index.html                   # HTML template
```

## Database Schema

The `restaurant_reviews` table includes:
- `id`: Unique identifier
- `title`: Review title
- `restaurant_name`: Name of the restaurant
- `location`: Restaurant location
- `content`: Full review text
- `embedding`: 768-dimensional vector (for semantic search)
- `overall_score`: Rating (0-10)
- `cuisines`: JSONB array of cuisine types
- `google_maps_place_id`, `latitude`, `longitude`: Location data
- `link`: URL to full review

## How It Works

1. **User enters search query** (e.g., "best seafood in Portland")
2. **React app calls Supabase Edge Function** with the query text
3. **Edge Function calls Gemini API** to generate a 768-dimensional embedding vector
4. **React app receives embedding** and calls Supabase database
5. **Database performs cosine similarity search** using pgvector and HNSW index
6. **Results are returned** sorted by similarity score
7. **UI displays results** with restaurant details and match percentage

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Testing the Application

1. **Start the dev server**: `npm run dev`
2. **Test search functionality**:
   - Enter a query and verify results appear
   - Try queries with no matches
   - Test the clear button
3. **Test advanced options**:
   - Adjust similarity threshold
   - Change max results count
4. **Test responsive design**:
   - Resize browser to mobile/tablet widths
   - Verify layout adapts correctly
5. **Test error handling**:
   - Enter extremely long queries
   - Disable network and observe error messages

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy Options

**Option 1: Vercel**
```bash
npm install -g vercel
vercel
```

**Option 2: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Option 3: Supabase Hosting**
- Use Supabase's built-in static hosting
- Integrates seamlessly with Edge Functions

**Important**: Set environment variables in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Troubleshooting

### "Missing Supabase environment variables"
- Ensure `.env` file exists and has correct values
- Restart the dev server after changing `.env`

### "Failed to generate embedding"
- Verify Edge Function is deployed: `supabase functions list`
- Check Gemini API key is set: `supabase secrets list`
- Test Edge Function directly (see setup instructions)

### "Database search failed"
- Verify database schema is set up correctly
- Check RPC function exists in Supabase dashboard
- Ensure pgvector extension is enabled

### No results found
- Lower the similarity threshold in advanced options
- Try more specific or different search terms
- Verify database has restaurant data

## Cost Estimate

- **Gemini API**: ~$0.38/month for 1,000 searches/day (free tier: 1,500 requests/day)
- **Supabase**: Free tier includes 500K Edge Function invocations, 500MB database
- **Hosting**: Free on Vercel/Netlify

**Total**: $0-25/month depending on traffic

## Future Enhancements

- [ ] Debounced search input
- [ ] Search history (localStorage)
- [ ] Filters (location, cuisine, rating)
- [ ] Map view with restaurant locations
- [ ] Hybrid search option (text + vector)
- [ ] User authentication and favorites
- [ ] Analytics dashboard

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
