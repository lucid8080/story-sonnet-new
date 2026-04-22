import prisma from '@/lib/prisma';
import { openRouterChatCompletion, type ChatMessage } from '@/lib/story-studio/openrouter';
import { openAiChatCompletion } from '@/lib/story-studio/vendors/openai';
import { generateStoryCoverImage } from '@/lib/story-studio/vendors/image-generation';
import { elevenLabsTextToSpeech } from '@/lib/story-studio/vendors/elevenlabs';
import { resolveSelectionForTool } from '@/lib/generation/resolve';
import type { GenerationToolKey } from '@/lib/generation/types';

async function resolveOrThrow(toolKey: GenerationToolKey) {
  const resolved = await resolveSelectionForTool(prisma, toolKey);
  if (!resolved.selection) {
    throw new Error(resolved.reason || `No available generation option for ${toolKey}.`);
  }
  return resolved.selection;
}

export async function executeTextGeneration(params: {
  toolKey: Extract<GenerationToolKey, 'story_studio_generate_brief' | 'story_studio_generate_script' | 'story_studio_generate_episode' | 'blog_generate_text'>;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const selection = await resolveOrThrow(params.toolKey);
  if (selection.provider === 'openrouter') {
    const content = await openRouterChatCompletion({
      messages: params.messages,
      model: selection.value,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });
    return { content, selection };
  }
  if (selection.provider === 'openai') {
    const content = await openAiChatCompletion({
      messages: params.messages,
      model: selection.value,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });
    return { content, selection };
  }
  throw new Error(`Unsupported text provider: ${selection.provider}`);
}

export async function executeImageGeneration(params: {
  toolKey: Extract<GenerationToolKey, 'story_studio_generate_cover' | 'blog_generate_image'>;
  prompt: string;
}) {
  const selection = await resolveOrThrow(params.toolKey);
  const result = await generateStoryCoverImage({
    prompt: params.prompt,
    provider: selection.provider === 'openai' ? 'openai' : 'openrouter',
    model: selection.value,
  });
  return { result, selection };
}

export async function executeNarrationGeneration(params: {
  toolKey: Extract<GenerationToolKey, 'story_studio_narration'>;
  text: string;
}) {
  const selection = await resolveOrThrow(params.toolKey);
  if (selection.provider !== 'elevenlabs') {
    throw new Error(`Unsupported narration provider: ${selection.provider}`);
  }
  const result = await elevenLabsTextToSpeech({
    text: params.text,
    voiceId: selection.value,
  });
  return { result, selection };
}
