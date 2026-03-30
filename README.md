# Strapi Plugin: AI SEO

AI-powered SEO tag generator for Strapi 5. Automatically generates meta tags, Open Graph tags, Twitter cards, schema markup, and more using LLM — directly from the Strapi admin panel.

## Features

- **AI-Powered Generation** — Uses any OpenAI-compatible LLM API (OpenAI, Google Gemini, Anthropic, Ollama, etc.) to generate optimized SEO metadata from your content.
- **Auto-Detection** — Automatically detects `yoastHeadJson` field or `seo` component (with `schema` and `ogGroup` repeatable components) in your content types.
- **Copy & Apply** — Copy individual tags or apply all generated SEO data directly to your entry with one click.
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
3. Click **Generate SEO Tags** in the popup.
4. Review the generated tags across the tabs (Meta Tags, OG Tags, Twitter, Schema, etc.).
5. Use the **Copy** button next to any field to copy it to clipboard.
6. Optionally **edit** any field directly in the popup.
7. Click **Apply to Entry** to save all generated SEO data to the entry.
8. Click **Regenerate** if you want to try again with fresh output.

## API Endpoints

The plugin registers the following admin API routes (all require authenticated admin):

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ai-seo/generate` | Generate SEO tags for an entry |
| `POST` | `/ai-seo/apply` | Apply generated SEO data to an entry |
| `GET` | `/ai-seo/settings` | Check if LLM is configured |

## Security

- The `LLM_API_KEY` is kept **server-side only** and never exposed to the admin frontend.
- All API endpoints are protected with the `admin::isAuthenticatedAdmin` policy.
- The plugin does not collect, store, or transmit any Strapi secrets or credentials.
- Content is sent to the configured LLM API only when the user explicitly clicks "Generate".

## Requirements

- Strapi 5.x
- Node.js >= 20.0.0

## Reporting Issues

Found a bug or have a feature request? Please open an issue on GitHub:

[https://github.com/nagendrasingh92/strapi-plugin-ai-seo/issues](https://github.com/nagendrasingh92/strapi-plugin-ai-seo/issues)

## License

[MIT](./LICENSE)
