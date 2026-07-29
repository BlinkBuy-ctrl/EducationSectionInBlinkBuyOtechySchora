import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const AI_MODE_SUPABASE_URL = 'https://jxsvepqrlmxddimkhwls.supabase.co';
// Service-role key — bypasses RLS, server-only, never expose to the client.
const AI_MODE_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4c3ZlcHFybG14ZGRpbWtod2xzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTMxNDQ1NywiZXhwIjoyMTAwODkwNDU3fQ.oTXlRfkxN8NaQ8E4WDnah6Fp0jA5hM1aPJaQHDyk0g0';
// Gemini API key — server-only.
const GEMINI_API_KEY = 'AQ.Ab8RN6LEHhlB2GHteddy3B92wgfPksZuZvw81FCvvnz9fdgUiw';

const db = createClient(AI_MODE_SUPABASE_URL, AI_MODE_SUPABASE_SERVICE_ROLE_KEY);

const EMBED_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = 'gemini-2.5-flash';
const HISTORY_LIMIT = 12; // how many past messages to remind the AI of

const SYSTEM_INSTRUCTION = `You are the AI Mode assistant inside SchoraHub, an education app.
You help students find and understand books in the library, and you can act as a
patient tutor — explaining concepts, answering follow-up questions, and checking
understanding, always grounded in the book excerpts you're given below.

Rules:
- Only make claims about book content that are actually supported by the excerpts provided.
- If the excerpts don't cover what's asked, say so honestly rather than guessing.
- Keep answers conversational and encouraging, like a helpful tutor, not a search engine.
- When recommending a book, mention it by its real title from the excerpts.`;

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
  });
  if (!res.ok) throw new Error(`Gemini embedding failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.embedding.values as number[];
}

async function generateReply(history: { role: string; content: string }[], context: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const contents = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nRelevant book excerpts:\n${context}` }],
      },
      contents,
    }),
  });
  if (!res.ok) throw new Error(`Gemini chat failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't come up with a reply just now.";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, conversationId, userUuid } = req.body ?? {};
  if (!message || !userUuid) {
    return res.status(400).json({ error: 'message and userUuid are required' });
  }

  try {
    // 1. Get or create the conversation
    let convoId = conversationId;
    if (!convoId) {
      const { data: convo, error } = await db
        .from('conversations')
        .insert({ user_uuid: userUuid })
        .select()
        .single();
      if (error) throw new Error(`Conversation create failed: ${error.message}`);
      convoId = convo.id;
    }

    // 2. Save the user's message
    const { error: userMsgError } = await db
      .from('messages')
      .insert({ conversation_id: convoId, role: 'user', content: message });
    if (userMsgError) throw new Error(`Saving user message failed: ${userMsgError.message}`);

    // 3. Find the book chunks most relevant to this question
    const queryEmbedding = await embed(message);
    const { data: matches, error: matchError } = await db.rpc('match_book_chunks', {
      query_embedding: queryEmbedding,
      match_count: 6,
    });
    if (matchError) throw new Error(`Chunk search failed: ${matchError.message}`);

    const context = (matches ?? [])
      .map((m: any) => `From "${m.book_title}": ${m.content}`)
      .join('\n\n');

    // 4. Pull recent conversation history (for memory)
    const { data: historyRows, error: historyError } = await db
      .from('messages')
      .select('role, content')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true })
      .limit(HISTORY_LIMIT);
    if (historyError) throw new Error(`Loading history failed: ${historyError.message}`);

    // 5. Ask Gemini, grounded in the matched book content + conversation so far
    const reply = await generateReply(historyRows ?? [], context || 'No matching book content found.');

    // 6. Save the assistant's reply
    const { error: assistantMsgError } = await db
      .from('messages')
      .insert({ conversation_id: convoId, role: 'assistant', content: reply });
    if (assistantMsgError) throw new Error(`Saving reply failed: ${assistantMsgError.message}`);

    return res.status(200).json({ conversationId: convoId, reply });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? 'Unknown error during chat' });
  }
}
