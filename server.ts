import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // API Route for Google News RSS proxy
  app.get("/api/news/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      // Format clean Google News RSS feed search query
      const query = `${q} news`;
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

      console.log(`[API] Fetching live Google News feed for: "${query}"`);
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        throw new Error(`Google News RSS responded with status: ${response.status}`);
      }

      const xmlText = await response.text();

      // Simple, robust XML parser for <item> nodes since we know the exact RSS structure
      const items: any[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(xmlText)) !== null && items.length < 15) {
        const itemContent = match[1];

        // Extract title
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "";

        // Extract link
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
        const link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "";

        // Extract pubDate
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const pubDate = pubDateMatch ? pubDateMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "";

        // Extract source
        const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/);
        let sourceName = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : "Google News";

        // Clean titles if they end with ' - SourceName'
        let cleanTitle = title;
        if (sourceName && cleanTitle.endsWith(` - ${sourceName}`)) {
          cleanTitle = cleanTitle.substring(0, cleanTitle.lastIndexOf(` - ${sourceName}`)).trim();
        } else if (cleanTitle.includes(" - ")) {
          const parts = cleanTitle.split(" - ");
          if (parts.length > 1) {
            const potentialSource = parts[parts.length - 1];
            if (potentialSource.length < 30) {
              sourceName = potentialSource;
              cleanTitle = parts.slice(0, parts.length - 1).join(" - ").trim();
            }
          }
        }

        // Format date to a simplified, readable format (e.g., "10h ago" or "May 22")
        let friendlyDate = pubDate;
        try {
          const pubDateObj = new Date(pubDate);
          if (!isNaN(pubDateObj.getTime())) {
            const diffMs = Date.now() - pubDateObj.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffMins < 60) {
              friendlyDate = `${diffMins}m ago`;
            } else if (diffHours < 24) {
              friendlyDate = `${diffHours}h ago`;
            } else if (diffDays < 7) {
              friendlyDate = `${diffDays}d ago`;
            } else {
              friendlyDate = pubDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }
          }
        } catch (e) {
          // Keep raw string on parsing error
        }

        if (cleanTitle && link) {
          items.push({
            title: decodeHtmlEntities(cleanTitle),
            link,
            date: friendlyDate,
            source: decodeHtmlEntities(sourceName)
          });
        }
      }

      return res.json({ items });
    } catch (error: any) {
      console.error("[API Error] Failed to fetch/parse Google News feed:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch live updates" });
    }
  });

  // Helper to decode HTML entities
  function decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&ndash;/g, "–")
      .replace(/&mdash;/g, "—");
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
