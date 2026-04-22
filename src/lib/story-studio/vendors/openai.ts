import type { ChatMessage } from '@/lib/story-studio/openrouter';

export async function openAiChatCompletion(opts: {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 8192,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI request failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = JSON.parse(text) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error('OpenAI returned empty message content');
  }
  return content;
}
