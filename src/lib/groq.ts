import Groq from "groq-sdk";

export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API Key is missing. Please add GROQ_API_KEY to your environment variables.');
  }
  return new Groq({ apiKey });
}

export const isGroqConfigured = !!process.env.GROQ_API_KEY;

