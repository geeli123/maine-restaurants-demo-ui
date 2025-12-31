import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { text } = await req.json()

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Invalid text input: text must be a non-empty string')
    }

    // Validate text length (Gemini has limits)
    if (text.length > 10000) {
      throw new Error('Text too long: maximum 10,000 characters allowed')
    }

    // Check for API key
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    // Call Gemini API
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/embedding-001',
        content: {
          parts: [{
            text: text.trim()
          }]
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()

    // Extract embedding from response
    if (!data.embedding || !data.embedding.values) {
      throw new Error('Invalid response format from Gemini API')
    }

    const embedding = data.embedding.values

    // Verify embedding dimension (should be 768 for embedding-001)
    if (embedding.length !== 768) {
      throw new Error(`Invalid embedding dimension: expected 768, got ${embedding.length}`)
    }

    // Return successful response
    return new Response(
      JSON.stringify({ embedding }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  } catch (error) {
    console.error('Error in generate-embedding function:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
})
