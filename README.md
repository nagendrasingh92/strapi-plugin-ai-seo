# Strapi Plugin: AI SEO

AI-powered SEO tag generator for Strapi 5. Automatically generates meta tags, Open Graph tags, Twitter cards, schema markup, and more using LLM — directly from the Strapi admin panel.

## Features

- **AI-Powered Generation** — Uses any OpenAI-compatible LLM API (OpenAI, Google Gemini, Anthropic, Ollama, etc.) to generate optimized SEO metadata from your content.
- **Page Instructions** — Add a free-text instruction to give the AI context about the page type, target audience, or specific SEO requirements before generating (e.g., *"This is a product page for a luxury watch brand targeting high-end customers in the US market"*).
- **Field Selection** — Choose which SEO fields to generate via checkboxes (Title, Meta Description, Keywords, Canonical URL, Robots Directives, Open Graph Tags, Twitter Card, Schema Markup). All fields are selected by default. The AI generates only the fields you select.
- **Schema Type Selection** — When Schema Markup is enabled, choose from 12 popular Schema.org types (Article, BlogPosting, Product, FAQPage, Organization, LocalBusiness, WebPage, BreadcrumbList, HowTo, Event, Person, Service) via multi-select checkboxes. All selected by default.
- **Custom Schema Types** — Add additional schema types via a comma-separated input field (e.g., Recipe, VideoObject, Course). The AI generates complete Schema.org JSON-LD for each selected type.
- **Auto-Detection** — Automatically detects `yoastHeadJson` field or `seo` component (with `schema` and `ogGroup` repeatable components) in your content types.
- **Copy & Apply** — Copy individual tags or apply all generated SEO data directly to your entry draft with one click. Page auto-reloads to reflect changes.
- **Tabbed Interface** — Organized view with tabs for Meta Tags, Open Graph, Twitter Cards, Schema Markup, Robots directives, and full JSON output.
- **Editable Output** — Edit any generated field before applying.
- **Works with Strapi 5** — Built with `@strapi/sdk-plugin` v6 and Strapi Design System v2.

## Installation

```bash
npm install strapi-plugin-ai-seo
```

Or with yarn:

```bash
yarn add strapi-plugin-ai-seo
```

## Configuration

### 1. Enable the Plugin

Add the plugin to your Strapi project's `config/plugins.ts` (or `config/plugins.js`):

```typescript
export default ({ env }) => ({
  'ai-seo': {
    enabled: true,
  },
});
```

### 2. Set Environment Variables

Add the following to your `.env` file:

```env
# Required: Your LLM API key (kept server-side, never exposed to browser)
LLM_API_KEY=your-api-key-here

# Required: Base URL of the OpenAI-compatible API
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

# Optional: Model to use (default: gpt-4o-mini)
LLM_MODEL=gemini-2.5-flash-lite
```

**Supported LLM Providers:**

| Provider | Base URL | Model Example |
|----------|----------|---------------|
| OpenAI | `https://api.openai.com/v1/` | `gpt-4o-mini` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/` | `gemini-2.5-flash-lite` |
| Anthropic (via proxy) | Your proxy URL | `claude-sonnet-4-20250514` |
| Ollama (local) | `http://localhost:11434/v1/` | `llama3` |

### 3. Content Type Setup

The plugin works with content types that have **either** of these SEO field structures:

**Option A: `yoastHeadJson` field**
A JSON field named `yoastHeadJson` on your content type. The plugin generates a complete Yoast-compatible JSON object.

**Option B: `seo` component**
A component named `seo` with the following fields:
- `title` (Text)
- `description` (Text)
- `keywords` (Text)
- `canonicalURL` (Text)
- `noindex` (Boolean)
- `nofollow` (Boolean)
- `schema` (Repeatable Component) — with fields: `schema` (JSON), `title` (Text), `type` (Text)
- `ogGroup` (Repeatable Component) — with fields: `property` (Text), `content` (Text), `name` (Text)

## Usage

1. Open any existing entry in the Strapi admin panel.
2. Click the **AI SEO** button in the right sidebar.
3. **(Optional) Page Instructions** — Type context about the page in the instructions field (e.g., the page type, target audience, brand tone, or market). This helps the AI produce more relevant SEO metadata.
4. **Fields to Generate** — Check/uncheck the SEO fields you want generated. By default all fields are selected (Title, Meta Description, Keywords, Canonical URL, Robots Directives, Open Graph Tags, Twitter Card, Schema Markup). Use "Select All" / "Deselect All" to toggle quickly.
5. **Schema Types** *(visible when Schema Markup is selected)* — Check/uncheck the Schema.org types you want. Optionally add custom schema types in the text input (comma-separated).
6. Click **Generate SEO Tags**.
7. Review the generated tags across the tabs (Meta Tags, OG Tags, Twitter, Schema, etc.).
8. Use the **Copy** button next to any field to copy it to clipboard.
9. Optionally **edit** any field directly in the popup.
10. Click **Apply to Draft** to save all generated SEO data to the entry draft. The page auto-reloads to show changes.
11. Click **Regenerate** to try again with fresh output (you can adjust instructions and field selections before regenerating).

## API Endpoints

The plugin registers the following admin API routes (all require authenticated admin):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ai-seo/generate` | Generate SEO tags for an entry |
| `POST` | `/ai-seo/apply` | Apply generated SEO data to an entry |
| `GET` | `/ai-seo/settings` | Check if LLM is configured |

### `POST /ai-seo/generate` — Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | string | ✓ | Content type UID (e.g. `api::article.article`) |
| `documentId` | string | ✓ | Entry document ID |
| `locale` | string | | Locale for localized content types |
| `pageInstructions` | string | | Free-text instructions for the AI (page type, audience, etc.) |
| `selectedFields` | string[] | | Fields to generate. Defaults to all fields when omitted. Allowed values: `title`, `description`, `keywords`, `canonical`, `robots`, `openGraph`, `twitterCard`, `schema` |
| `schemaTypes` | string[] | | Schema.org types to generate (used when `schema` is in `selectedFields`) |
| `customSchemas` | string | | Comma-separated additional schema types |

## Security

- The `LLM_API_KEY` is kept **server-side only** and never exposed to the admin frontend.
- All API endpoints are protected with the `admin::isAuthenticatedAdmin` policy.
- The plugin does not collect, store, or transmit any Strapi secrets or credentials.
- Content is sent to the configured LLM API only when the user explicitly clicks "Generate".

## Requirements

- Strapi 5.x
- Node.js >= 20.0.0

## Changelog

### v1.2.0
- **New: Page Instructions** — Free-text input to give the AI context about the page (type, audience, brand, etc.) before generating SEO tags.
- **New: Field Selection** — Checkboxes to choose which SEO fields to generate (Title, Meta Description, Keywords, Canonical URL, Robots Directives, Open Graph Tags, Twitter Card, Schema Markup). All selected by default.
- **Improved: Schema Types panel** — Now shown only when the Schema Markup field is selected, reducing visual clutter.
- **Improved: Generate button** — Disabled when no fields are selected.

### v1.1.0
- Schema type selection with 12 popular Schema.org types.
- Custom schema types input.
- Editable output fields in the modal.

### v1.0.0
- Initial release with yoastHeadJson and seo component auto-detection.
- Generate, copy, and apply SEO tags from the Strapi admin panel.

## Reporting Issues

Found a bug or have a feature request? Please open an issue on GitHub:

[https://github.com/nagendrasingh92/strapi-plugin-ai-seo/issues](https://github.com/nagendrasingh92/strapi-plugin-ai-seo/issues)

## License

[MIT](./LICENSE)
