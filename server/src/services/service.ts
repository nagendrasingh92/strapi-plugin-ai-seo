import type { Core } from '@strapi/strapi';

interface GenerateParams {
  uid: string;
  documentId: string;
  locale?: string;
  pageInstructions?: string;
  selectedFields?: string[];
  schemaTypes?: string[];
  customSchemas?: string;
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

const ALL_FIELDS = ['title', 'description', 'keywords', 'canonical', 'robots', 'openGraph', 'twitterCard', 'schema'];

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Detect the SEO field structure for a content type.
   */
  _detectSeoStructure(contentType: any): SeoStructure {
    const attrs = contentType.attributes || {};

    if (attrs.yoastHeadJson) {
      return { type: 'yoastHeadJson', hasSchema: true, hasOgGroup: true };
    }

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
        const clean = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (clean) {
          textParts.push(`${key}: ${clean}`);
        }
      }
    }

    return textParts.join('\n\n');
  },

  /**
   * Build the LLM prompt based on content, structure type, selected fields, and page instructions.
   */
  _buildPrompt(
    content: string,
    structure: SeoStructure,
    existingSeo: any,
    schemaTypes?: string[],
    customSchemas?: string,
    pageInstructions?: string,
    selectedFields?: string[]
  ): string {
    const fields = selectedFields && selectedFields.length > 0 ? selectedFields : ALL_FIELDS;

    // Build schema instruction (only when schema field is requested)
    let schemaInstruction = '';
    if (fields.includes('schema')) {
      const allSchemaTypes: string[] = [...(schemaTypes || [])];
      if (customSchemas) {
        const custom = customSchemas.split(',').map((s: string) => s.trim()).filter(Boolean);
        allSchemaTypes.push(...custom);
      }
      if (allSchemaTypes.length > 0) {
        schemaInstruction = `\nSCHEMA TYPES TO GENERATE: You MUST generate schema markup for each of these types: ${allSchemaTypes.join(', ')}. Generate a complete, valid Schema.org JSON-LD object for EACH type listed.`;
      }
    }

    const pageContext = pageInstructions
      ? `\nPAGE CONTEXT / INSTRUCTIONS:\n${pageInstructions}\n`
      : '';

    // Describe which fields are requested
    const fieldNames = fields.map((f) => {
      const map: Record<string, string> = {
        title: 'Title',
        description: 'Meta Description',
        keywords: 'Keywords',
        canonical: 'Canonical URL',
        robots: 'Robots Directives',
        openGraph: 'Open Graph Tags',
        twitterCard: 'Twitter Card',
        schema: 'Schema Markup',
      };
      return map[f] || f;
    });

    const basePrompt = `You are an expert SEO specialist. Analyze the following content and generate SEO metadata.
${pageContext}
CONTENT:
${content}

${existingSeo ? `EXISTING SEO DATA (use as reference, improve if needed):\n${JSON.stringify(existingSeo, null, 2)}` : ''}
${schemaInstruction}

FIELDS REQUESTED: ${fieldNames.join(', ')}
Generate ONLY the fields listed above. Do not generate fields that are not listed.

SEO best practices:
- Title: 50-60 characters, include the primary keyword from the content
- Description: 150-160 characters, compelling and keyword-rich
- Keywords: comma-separated, 5-10 relevant keywords

CRITICAL RULES:
- Generate REAL, ACTUAL content based on the text provided above. Do NOT use placeholders like [primary keyword], [keyword 1], [brand name], etc.
- Every field must contain finalized text derived from the content — never template variables or bracketed placeholders.
- URL FIELDS (canonical, canonicalURL, og:image, twitter:image, og_image, and any other URL fields): leave as an empty string "" if the actual URL is not present in the content. NEVER invent, guess, or fabricate URLs. NEVER use example.com, yoursite.com, yourdomain.com, website.com, or any other placeholder domain.
- Return ONLY valid JSON, no markdown, no code blocks, no explanation.`;

    if (structure.type === 'yoastHeadJson') {
      return `${basePrompt}

Return JSON with ONLY these keys (include only the fields listed in FIELDS REQUESTED):
{
${fields.includes('title') ? '  "title": "(actual SEO title based on content)",' : ''}
${fields.includes('description') ? '  "description": "(actual meta description based on content)",' : ''}
${fields.includes('keywords') ? '  "keywords": "(actual comma-separated keywords)",' : ''}
${fields.includes('canonical') ? '  "canonical": "(leave empty string if URL not found in content)",' : ''}
${fields.includes('openGraph') ? `  "og_title": "(actual OG title)",
  "og_description": "(actual OG description)",
  "og_type": "article",
  "og_locale": "en_US",
  "og_site_name": "(site name if found in content, otherwise empty string)",
  "og_image": "(leave empty string — do not invent URLs)",` : ''}
${fields.includes('twitterCard') ? `  "twitter_card": "summary_large_image",` : ''}
${fields.includes('robots') ? `  "robots": {
    "index": "index",
    "follow": "follow",
    "max-snippet": "max-snippet:-1",
    "max-image-preview": "max-image-preview:large",
    "max-video-preview": "max-video-preview:-1"
  },` : ''}
${fields.includes('schema') ? `  "schema": {
    "@context": "https://schema.org",
    "@graph": [... generate schema objects for each requested schema type ...]
  }` : ''}
}`;
    }

    // seo component structure
    const includeOgGroup = fields.includes('openGraph') || fields.includes('twitterCard');
    const ogGroupEntries: string[] = [];

    if (fields.includes('openGraph')) {
      ogGroupEntries.push(
        `    { "property": "og:title", "content": "(actual OG title)", "name": "" }`,
        `    { "property": "og:description", "content": "(actual OG description)", "name": "" }`,
        `    { "property": "og:type", "content": "article", "name": "" }`,
        `    { "property": "og:image", "content": "(empty string — do not invent URLs)", "name": "" }`,
        `    { "property": "og:image:type", "content": "image/jpeg", "name": "" }`,
        `    { "property": "og:image:width", "content": "1200", "name": "" }`
      );
    }
    if (fields.includes('twitterCard')) {
      ogGroupEntries.push(
        `    { "property": "twitter:card", "content": "summary_large_image", "name": "" }`,
        `    { "property": "twitter:title", "content": "(actual Twitter title)", "name": "" }`,
        `    { "property": "twitter:description", "content": "(actual Twitter description)", "name": "" }`,
        `    { "property": "twitter:image", "content": "(empty string — do not invent URLs)", "name": "" }`
      );
    }

    return `${basePrompt}

Return JSON with ONLY these keys (include only the fields listed in FIELDS REQUESTED):
{
${fields.includes('title') ? '  "title": "(actual SEO title based on content)",' : ''}
${fields.includes('description') ? '  "description": "(actual meta description based on content)",' : ''}
${fields.includes('keywords') ? '  "keywords": "(actual comma-separated keywords)",' : ''}
${fields.includes('canonical') ? '  "canonicalURL": "(leave empty string if URL not found in content)",' : ''}
${fields.includes('robots') ? `  "noindex": false,
  "nofollow": false,` : ''}
${fields.includes('schema') ? `  "schema": [
    ... for EACH requested schema type, generate an object like:
    {
      "title": "(descriptive title for this schema)",
      "type": "(schema type name, e.g. Article, FAQPage)",
      "schema": { "@context": "https://schema.org", "@type": "...", ... complete schema object ... }
    }
  ],` : ''}
${includeOgGroup ? `  "ogGroup": [
${ogGroupEntries.join(',\n')}
  ]` : ''}
}`;
  },

  /**
   * Call the LLM API to generate SEO tags.
   */
  async _callLLM(prompt: string): Promise<any> {
    const apiKey = process.env.LLM_API_KEY;
    const baseUrl = process.env.LLM_BASE_URL;
    const model = process.env.LLM_MODEL || 'gpt-4o-mini';

    if (!apiKey || !baseUrl) {
      throw new Error('LLM not configured. Set LLM_API_KEY and STRAPI_ADMIN_LLM_BASE_URL environment variables.');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        signal: controller.signal,
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
          max_tokens: 8000,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('LLM returned empty response');
    }

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
  async generateSeoTags({ uid, documentId, locale, pageInstructions, selectedFields, schemaTypes, customSchemas }: GenerateParams) {
    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    if (!contentType) {
      throw new Error(`Content type ${uid} not found`);
    }

    const structure = this._detectSeoStructure(contentType);

    const queryOptions: any = { populate: '*' };
    if (locale) queryOptions.locale = locale;

    const entry = await strapi.documents(uid as any).findOne({
      documentId,
      ...queryOptions,
    });

    if (!entry) {
      throw new Error(`Entry ${documentId} not found in ${uid}`);
    }

    const content = this._extractContent(entry, contentType);
    if (!content) {
      throw new Error('No text content found in entry to generate SEO tags from');
    }

    const existingSeo = this._getExistingSeo(entry, structure);

    const prompt = this._buildPrompt(content, structure, existingSeo, schemaTypes, customSchemas, pageInstructions, selectedFields);
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
