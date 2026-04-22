export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export async function openRouterChatCompletion(opts: {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new OpenRouterError(
      'OPENROUTER_API_KEY is not configured. Add it to .env for Story Studio generation.'
    );
  }

  const model =
    opts.model?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    'anthropic/claude-3.5-sonnet';
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': siteUrl,
      'X-Title': 'Story Sonnet Story Studio',
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 8192,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new OpenRouterError(
      `OpenRouter request failed (${res.status}): ${text.slice(0, 500)}`,
      res.status
    );
  }

  let data: {
    choices?: { message?: { content?: string | null } }[];
  };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new OpenRouterError('OpenRouter returned non-JSON body');
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new OpenRouterError('OpenRouter returned empty message content');
  }

  return content;
}
