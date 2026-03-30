import type { Core } from '@strapi/strapi';

interface GenerateParams {
  uid: string;
  documentId: string;
  locale?: string;
}

interface ApplyParams {
  uid: string;
  documentId: string;
  locale?: string;
  seoData: any;
  targetField: 'yoastHeadJson' | 'seo';
}

interface SeoStructure {
  type: 'yoastHeadJson' | 'seo' | 'none';
  hasSchema: boolean;
  hasOgGroup: boolean;
}

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Detect the SEO field structure for a content type.
   */
  _detectSeoStructure(contentType: any): SeoStructure {
    const attrs = contentType.attributes || {};

    // Check for yoastHeadJson field
    if (attrs.yoastHeadJson) {
      return { type: 'yoastHeadJson', hasSchema: true, hasOgGroup: true };
    }

    // Check for seo component
    if (attrs.seo && (attrs.seo as any).type === 'component') {
      const componentName = (attrs.seo as any).component;
      let hasSchema = false;
      let hasOgGroup = false;

      if (componentName) {
        try {
          const component = strapi.components[componentName];
          if (component?.attributes) {
            hasSchema = !!component.attributes.schema;
            hasOgGroup = !!component.attributes.ogGroup;
          }
        } catch {
          // Component not found, continue with defaults
        }
      }

      return { type: 'seo', hasSchema, hasOgGroup };
    }

    return { type: 'none', hasSchema: false, hasOgGroup: false };
  },

  /**
   * Extract text content from an entry for LLM context.
   */
  _extractContent(entry: any, contentType: any): string {
    const textParts: string[] = [];
    const attrs = contentType.attributes || {};

    for (const [key, attr] of Object.entries(attrs)) {
      const type = (attr as any).type;
      if (['string', 'text', 'richtext'].includes(type) && entry[key]) {
        const value = String(entry[key]);
        // Strip HTML tags for richtext
        const clean = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean) {
          textParts.push(`${key}: ${clean}`);
        }
      }
    }

    return textParts.join('\n\n');
  },

  /**
   * Build the LLM prompt based on content and structure type.
   */
  _buildPrompt(content: string, structure: SeoStructure, existingSeo: any): string {
    const basePrompt = `You are an expert SEO specialist. Analyze the following content and generate comprehensive SEO metadata.

CONTENT:
${content}

${existingSeo ? `EXISTING SEO DATA (use as reference, improve if needed):
${JSON.stringify(existingSeo, null, 2)}` : ''}

Generate SEO metadata in the following JSON format. Be precise and follow SEO best practices:
- Title: 50-60 characters, include primary keyword
- Description: 150-160 characters, compelling and keyword-rich
- Keywords: comma-separated, 5-10 relevant keywords
- OG tags: optimized for social sharing
- Twitter card: summary_large_image format
- Schema markup: appropriate for the content type

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.`;

    if (structure.type === 'yoastHeadJson') {
      return `${basePrompt}

Return JSON in this exact structure:
{
  "title": "SEO Title",
  "description": "Meta description",
  "canonical": "canonical URL",
  "og_title": "OG Title",
  "og_description": "OG Description",
  "og_type": "article",
  "og_locale": "en_US",
  "twitter_card": "summary_large_image",
  "robots": {
    "index": "index",
    "follow": "follow",
    "max-snippet": "max-snippet:-1",
    "max-image-preview": "max-image-preview:large",
    "max-video-preview": "max-video-preview:-1"
  },
  "schema": {
    "@context": "https://schema.org",
    "@graph": []
  },
  "keywords": "keyword1, keyword2"
}`;
    }

    return `${basePrompt}

Return JSON in this exact structure:
{
  "title": "SEO Title",
  "description": "Meta description",
  "keywords": "keyword1, keyword2",
  "canonicalURL": "canonical URL or empty string",
  "noindex": false,
  "nofollow": false,
  "schema": [
    {
      "title": "Schema Title",
      "type": "Schema Type (e.g. FAQ Schema, Organization Schema)",
      "schema": {}
    }
  ],
  "ogGroup": [
    { "property": "og:title", "content": "OG Title", "name": "" },
    { "property": "og:description", "content": "OG Description", "name": "" },
    { "property": "og:type", "content": "article", "name": "" },
    { "property": "og:image", "content": "", "name": "" },
    { "property": "og:image:type", "content": "image/jpeg", "name": "" },
    { "property": "og:image:width", "content": "1200", "name": "" },
    { "property": "twitter:card", "content": "summary_large_image", "name": "" },
    { "property": "twitter:title", "content": "Twitter Title", "name": "" },
    { "property": "twitter:description", "content": "Twitter Description", "name": "" },
    { "property": "twitter:image", "content": "", "name": "" }
  ]
}`;
  },

  /**
   * Call the LLM API to generate SEO tags.
   */
  async _callLLM(prompt: string): Promise<any> {
    const apiKey = process.env.LLM_API_KEY;
    const baseUrl = process.env.STRAPI_ADMIN_LLM_BASE_URL;
    const model = process.env.STRAPI_ADMIN_LLM_MODEL || 'gpt-4o-mini';

    if (!apiKey || !baseUrl) {
      throw new Error('LLM not configured. Set LLM_API_KEY and STRAPI_ADMIN_LLM_BASE_URL environment variables.');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert SEO specialist. Always return valid JSON only, no markdown formatting, no code blocks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('LLM returned empty response');
    }

    // Parse the JSON response, handling possible markdown code blocks
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${cleaned.substring(0, 200)}`);
    }
  },

  /**
   * Get existing SEO data from an entry.
   */
  _getExistingSeo(entry: any, structure: SeoStructure): any {
    if (structure.type === 'yoastHeadJson' && entry.yoastHeadJson) {
      return typeof entry.yoastHeadJson === 'string'
        ? JSON.parse(entry.yoastHeadJson)
        : entry.yoastHeadJson;
    }

    if (structure.type === 'seo' && entry.seo) {
      return entry.seo;
    }

    return null;
  },

  /**
   * Generate SEO tags for an entry.
   */
  async generateSeoTags({ uid, documentId, locale }: GenerateParams) {
    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    if (!contentType) {
      throw new Error(`Content type ${uid} not found`);
    }

    const structure = this._detectSeoStructure(contentType);

    // Fetch the entry with populated fields
    const queryOptions: any = { populate: '*' };
    if (locale) queryOptions.locale = locale;

    const entry = await strapi.documents(uid as any).findOne({
      documentId,
      ...queryOptions,
    });

    if (!entry) {
      throw new Error(`Entry ${documentId} not found in ${uid}`);
    }

    // Extract content for LLM
    const content = this._extractContent(entry, contentType);
    if (!content) {
      throw new Error('No text content found in entry to generate SEO tags from');
    }

    // Get existing SEO data as reference
    const existingSeo = this._getExistingSeo(entry, structure);

    // Build prompt and call LLM
    const prompt = this._buildPrompt(content, structure, existingSeo);
    const generated = await this._callLLM(prompt);

    return {
      seoData: generated,
      structureType: structure.type,
      hasSchema: structure.hasSchema,
      hasOgGroup: structure.hasOgGroup,
      existingSeo,
    };
  },

  /**
   * Apply generated SEO data back to the entry.
   */
  async applySeoData({ uid, documentId, locale, seoData, targetField }: ApplyParams) {
    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    if (!contentType) {
      throw new Error(`Content type ${uid} not found`);
    }

    const updateData: any = {};

    if (targetField === 'yoastHeadJson') {
      updateData.yoastHeadJson = seoData;
    } else if (targetField === 'seo') {
      updateData.seo = {
        title: seoData.title || '',
        description: seoData.description || '',
        keywords: seoData.keywords || '',
        canonicalURL: seoData.canonicalURL || '',
        noindex: seoData.noindex || false,
        nofollow: seoData.nofollow || false,
        schema: (seoData.schema || []).map((s: any) => ({
          schema: typeof s.schema === 'string' ? s.schema : JSON.stringify(s.schema),
          title: s.title || '',
          type: s.type || '',
        })),
        ogGroup: (seoData.ogGroup || []).map((og: any) => ({
          property: og.property || '',
          content: og.content || '',
          name: og.name || '',
        })),
      };
    } else {
      throw new Error(`Unknown target field: ${targetField}`);
    }

    const updateOptions: any = { documentId, data: updateData };
    if (locale) updateOptions.locale = locale;

    const updated = await strapi.documents(uid as any).update(updateOptions);

    return { success: true, documentId: updated.documentId };
  },
});

export default service;
