'use server';
/**
 * @fileOverview An AI flow for generating images from text prompts.
 *
 * - generateImageFromPrompt - A function that takes a text prompt and returns a generated image as a data URI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const GenerateImageInputSchema = z.string().describe('The text prompt to generate an image from.');
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

export const GenerateImageOutputSchema = z.object({
    imageUrl: z.string().describe("The generated image as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;


export async function generateImageFromPrompt(prompt: GenerateImageInput): Promise<GenerateImageOutput> {
  return imageGenerationFlow(prompt);
}


const imageGenerationFlow = ai.defineFlow(
  {
    name: 'imageGenerationFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (prompt) => {
    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: `Generate a high-quality, professional, and visually appealing image for an investment website carousel based on the following theme: ${prompt}`,
    });
    
    if (!media.url) {
      throw new Error('Image generation failed to return a URL.');
    }

    return {
      imageUrl: media.url,
    };
  }
);
