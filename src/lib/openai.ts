import OpenAI from 'openai';

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // We throw only when the client is actually needed at runtime.
    // This allows the build process (which imports this module) to succeed.
    throw new Error("Missing env.OPENAI_API_KEY");
  }
  return new OpenAI({ apiKey });
}

// Optional: for cases where you just want to check if the client can be initialized
export const isOpenAIConfigured = !!process.env.OPENAI_API_KEY;
