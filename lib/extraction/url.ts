import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export async function extractTextFromURL(url: string): Promise<string> {
  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialContentBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    
    // Parse with JSDOM
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Extract readable content
    const reader = new Readability(document);
    const article = reader.parse();
    
    if (!article) {
      // Fallback: extract body text
      const body = document.querySelector('body');
      return body?.textContent?.trim() || '';
    }
    
    // Combine title and content
    const parts = [];
    if (article.title) {
      parts.push(`# ${article.title}`);
    }
    if (article.byline) {
      parts.push(`By: ${article.byline}`);
    }
    if (article.textContent) {
      parts.push(article.textContent);
    }
    
    return parts.join('\n\n').trim();
  } catch (error) {
    throw new Error(`Failed to extract text from URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}
