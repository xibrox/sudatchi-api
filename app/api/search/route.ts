// File: /app/api/search/route.ts

interface AniListPageInfo {
    total: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
  }
  
  interface AniListMedia {
    id: number;
    title: {
      romaji: string;
      english: string | null;
      native: string;
    };
    description?: string;
    episodes?: number;
    genres: string[];
    coverImage: {
      extraLarge?: string;
      large?: string;
      medium?: string;
      color?: string | null;
    };
  }
  
  interface AniListPage {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  }
  
  interface AniListResponse {
    data: {
      Page: AniListPage;
    };
  }
  
  export async function GET(request: Request): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
  
    if (!q) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'q' is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  
    // GraphQL query with pagination and cover image, excluding 18+ content
    const query = `
      query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media(search: $search, type: ANIME, isAdult: false) {
            id
            title {
              romaji
              english
              native
            }
            description
            episodes
            genres
            coverImage {
              extraLarge
              large
              medium
              color
            }
          }
        }
      }
    `;
  
    const perPage = 50;
    let page = 1;
    let hasNextPage = true;
    let allMedia: AniListMedia[] = [];
  
    try {
      while (hasNextPage) {
        const variables = { search: q, page, perPage };
  
        const response = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ query, variables })
        });
  
        const json: AniListResponse = await response.json();
  
        if (!response.ok) {
          return new Response(JSON.stringify(json), {
            status: response.status,
            headers: { "Content-Type": "application/json" }
          });
        }
  
        const pageData = json.data.Page;
        allMedia = allMedia.concat(pageData.media);
        hasNextPage = pageData.pageInfo.hasNextPage;
        page++;
      }
  
      return new Response(JSON.stringify({ media: allMedia }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  