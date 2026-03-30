import type { Core } from '@strapi/strapi';

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async generate(ctx: any) {
    const { uid, documentId, locale } = ctx.request.body;

    if (!uid || !documentId) {
      return ctx.badRequest('uid and documentId are required');
    }

    const service = strapi.plugin('ai-seo').service('service');

    try {
      const result = await service.generateSeoTags({ uid, documentId, locale });
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error('[ai-seo] Generation failed:', error);
      ctx.throw(500, error.message || 'SEO generation failed');
    }
  },

  async apply(ctx: any) {
    const { uid, documentId, locale, seoData, targetField } = ctx.request.body;

    if (!uid || !documentId || !seoData) {
      return ctx.badRequest('uid, documentId, and seoData are required');
    }

    const service = strapi.plugin('ai-seo').service('service');

    try {
      const result = await service.applySeoData({ uid, documentId, locale, seoData, targetField });
      ctx.body = result;
    } catch (error: any) {
      strapi.log.error('[ai-seo] Apply failed:', error);
      ctx.throw(500, error.message || 'Failed to apply SEO data');
    }
  },

  async getSettings(ctx: any) {
    const baseUrl = process.env.LLM_BASE_URL || '';
    const model = process.env.LLM_MODEL || '';
    const hasApiKey = !!process.env.LLM_API_KEY;

    ctx.body = {
      configured: hasApiKey && !!baseUrl,
      model,
    };
  },
});

export default controller;
