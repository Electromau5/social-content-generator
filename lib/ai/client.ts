import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateJSONOptions<T extends z.ZodType> {
  schema: T;
  systemPrompt: string;
  userPrompt: string;
  maxRetries?: number;
}

export class AIClient {
  private static extractJSON(text: string): string {
    // Try to find JSON in the response
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    
    // Try to find raw JSON object or array
    const objectMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objectMatch) {
      return objectMatch[1].trim();
    }
    
    return text.trim();
  }

  static async generateJSON<T extends z.ZodType>(
    options: GenerateJSONOptions<T>
  ): Promise<z.infer<T>> {
    const { schema, systemPrompt, userPrompt, maxRetries = 3 } = options;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: `${systemPrompt}

CRITICAL INSTRUCTIONS:
1. You MUST respond with valid JSON only - no markdown, no explanations, no text before or after.
2. The JSON must match the exact schema provided.
3. Do not include any text outside the JSON object.
4. Start your response with { or [ and end with } or ]`,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });

        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new Error('No text content in response');
        }

        const jsonStr = this.extractJSON(textContent.text);
        const parsed = JSON.parse(jsonStr);
        const validated = schema.parse(parsed);
        
        return validated;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Failed to generate valid JSON');
  }

  static async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    return textContent.text;
  }
}
