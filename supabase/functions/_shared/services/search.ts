export interface SearchResult {
  title: string
  link: string
  snippet: string
  date?: string
}

export interface SearchResponse {
  results: SearchResult[]
  searchTerm: string
}

export class SearchService {
  private static readonly SERPER_API_URL = 'https://google.serper.dev/search'
  
  static async search(query: string): Promise<SearchResponse> {
    const apiKey = Deno.env.get('SERPER_API_KEY')
    if (!apiKey) {
      throw new Error('SERPER_API_KEY environment variable is required')
    }

    try {
      const response = await fetch(this.SERPER_API_URL, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: 5, // Limit to 5 results to keep response manageable
          hl: 'en',
          gl: 'us'
        }),
      })

      if (!response.ok) {
        throw new Error(`Search API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      const results: SearchResult[] = (data.organic || []).map((item: any) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
        date: item.date
      }))

      return {
        results,
        searchTerm: query
      }
    } catch (error) {
      console.error('Search service error:', error)
      throw new Error(`Failed to perform search: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}