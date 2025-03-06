// File: /app/api/search/route.ts
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
  
    if (!q) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'q' is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  
    // GraphQL query with pagination and an isAdult filter to exclude 18+ content
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
            isAdult
          }
        }
      }
    `;
  
    let allMedia: any[] = [];
    let page = 1;
    const perPage = 50; // Adjust this value if necessary
    let hasNextPage = true;
  
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
  
        const json = await response.json();
        if (!response.ok) {
          return new Response(JSON.stringify(json), {
            status: response.status,
            headers: { "Content-Type": "application/json" }
          });
        }
  
        const pageData = json.data.Page;
        // As an extra safeguard, filter out any media items marked as adult
        const filteredMedia = pageData.media.filter((item: any) => !item.isAdult);
        allMedia = allMedia.concat(filteredMedia);
  
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
  