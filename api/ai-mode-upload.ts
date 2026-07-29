import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';

const AI_MODE_SUPABASE_URL = 'https://jxsvepqrlmxddimkhwls.supabase.co';
// Service-role key — bypasses RLS, server-only, never expose to the client.
const AI_MODE_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4c3ZlcHFybG14ZGRpbWtod2xzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTMxNDQ1NywiZXhwIjoyMTAwODkwNDU3fQ.oTXlRfkxN8NaQ8E4WDnah6Fp0jA5hM1aPJaQHDyk0g0';
// Mistral API key — server-only, used to generate embeddings for each chunk.
// Get one free at https://console.mistral.ai
const MISTRAL_API_KEY = 'MkEsiAES0gH8WlUBvAWMLR6VoMkIfG2B';

const db = createClient(AI_MODE_SUPABASE_URL, AI_MODE_SUPABASE_SERVICE_ROLE_KEY);

const EMBED_MODEL = 'mistral-embed';
const CHUNK_SIZE = 1200;     // characters per chunk, roughly a few paragraphs
const CHUNK_OVERLAP = 150;   // slight overlap so ideas that span chunks aren't lost

// Splits long text into overlapping chunks so we don't lose context at the edges.
function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.length > 30); // drop tiny fragments
}

// Calls Mistral's embedding endpoint for one chunk of text, returns a 1024-length vector.
async function embed(text: string): Promise<number[]> {
  const res = await fetch('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: [text] }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Mistral embedding failed: ${res.status} ${errBody}`);
  }
  const data = await res.json();
  return data.data[0].embedding as number[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { fileBase64, fileName, title, author, description, category } = req.body ?? {};
  if (!fileBase64 || !fileName || !title) {
    return res.status(400).json({ error: 'fileBase64, fileName and title are required' });
  }

  try {
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // 1. Save the actual PDF file to storage
    const storagePath = `${Date.now()}-${fileName}`;
    const { error: uploadError } = await db.storage
      .from('ai-mode-books')
      .upload(storagePath, fileBuffer, { contentType: 'application/pdf' });
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // 2. Extract the real text from the PDF
    const parsed = await pdfParse(fileBuffer);
    const fullText = parsed.text || '';

    // 3. Create the book record
    const { data: book, error: bookError } = await db
      .from('books')
      .insert({
        title,
        author: author ?? null,
        description: description ?? null,
        category: category ?? null,
        storage_path: storagePath,
        has_full_text: fullText.trim().length > 0,
      })
      .select()
      .single();
    if (bookError) throw new Error(`Book insert failed: ${bookError.message}`);

    // 4. Chunk + embed the text, save each chunk
    const chunks = fullText.trim().length > 0 ? chunkText(fullText) : [title + '. ' + (description ?? '')];
    let savedChunks = 0;

    for (const chunk of chunks) {
      const embedding = await embed(chunk);
      const { error: chunkError } = await db.from('book_chunks').insert({
        book_id: book.id,
        content: chunk,
        embedding,
      });
      if (chunkError) throw new Error(`Chunk insert failed: ${chunkError.message}`);
      savedChunks++;
      // Free-tier Mistral is rate-limited to ~1 req/sec — pace the loop so
      // uploads with many chunks don't get throttled.
      await new Promise(r => setTimeout(r, 1100));
    }

    return res.status(200).json({ ok: true, bookId: book.id, chunksSaved: savedChunks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? 'Unknown error during upload pipeline' });
  }
}
