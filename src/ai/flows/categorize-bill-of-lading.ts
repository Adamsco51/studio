// noinspection JSUnusedLocalSymbols
'use server';

/**
 * @fileOverview This file defines a Genkit flow for categorizing a Bill of Lading (BL) description into suggested categories and sub-categories.
 *
 * - categorizeBillOfLading - A function that takes a BL description and returns suggested categories and subcategories.
 * - CategorizeBillOfLadingInput - The input type for the categorizeBillOfLading function.
 * - CategorizeBillOfLadingOutput - The output type for the categorizeBillOfLading function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeBillOfLadingInputSchema = z.object({
  description: z.string().describe('The description of the Bill of Lading.'),
});

export type CategorizeBillOfLadingInput = z.infer<typeof CategorizeBillOfLadingInputSchema>;

const CategorizeBillOfLadingOutputSchema = z.object({
  categories: z.array(z.string()).describe('Suggested categories for the Bill of Lading.'),
  subCategories: z.array(z.string()).describe('Suggested sub-categories for the Bill of Lading.'),
});

export type CategorizeBillOfLadingOutput = z.infer<typeof CategorizeBillOfLadingOutputSchema>;

export async function categorizeBillOfLading(input: CategorizeBillOfLadingInput): Promise<CategorizeBillOfLadingOutput> {
  return categorizeBillOfLadingFlow(input);
}

const categorizeBillOfLadingPrompt = ai.definePrompt({
  name: 'categorizeBillOfLadingPrompt',
  input: {schema: CategorizeBillOfLadingInputSchema},
  output: {schema: CategorizeBillOfLadingOutputSchema},
  prompt: `You are an expert in freight forwarding and logistics. Given the description of a Bill of Lading (BL), suggest relevant categories and sub-categories for it.

Description: {{{description}}}

Provide the categories and sub-categories as arrays of strings.
`, // Ensure the prompt adheres to Handlebars syntax.
});

const categorizeBillOfLadingFlow = ai.defineFlow(
  {
    name: 'categorizeBillOfLadingFlow',
    inputSchema: CategorizeBillOfLadingInputSchema,
    outputSchema: CategorizeBillOfLadingOutputSchema,
  },
  async input => {
    const {output} = await categorizeBillOfLadingPrompt(input);
    return output!;
  }
);
