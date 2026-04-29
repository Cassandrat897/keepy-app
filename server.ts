import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import * as path from 'path';
import * as cheerio from 'cheerio';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route to fetch link metadata
  app.get('/api/metadata', async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
      // Add a simple user-agent to avoid basic blocks
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        redirect: 'follow',
      });
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      let ogTitle = $('meta[property="og:title"]').attr('content');
      let title = ogTitle || $('title').text() || '';
      
      // Clean up Google Maps title specifically
      if (title.includes('Google Maps')) {
        title = title.replace(/\\s*-?\\s*Google Maps/i, '').trim();
      }

      if (!title && response.url.includes('/place/')) {
        try {
           const parts = response.url.split('/place/')[1].split('/')[0];
           title = decodeURIComponent(parts.replace(/\+/g, ' '));
        } catch (e) {}
      }

      res.json({ 
        title,
        finalUrl: response.url
      });
    } catch (error) {
      console.error('Error fetching metadata:', error);
      res.status(500).json({ error: 'Failed to fetch metadata' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
