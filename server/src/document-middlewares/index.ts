import type { Core } from '@strapi/strapi';
import { cityValidate } from './city-validate';
import { normalizeContact } from './normalize-contact';
import { pricingValidate } from './pricing-validate';
import { scheduleValidate } from './schedule-validate';
import { slug } from './slug';

/** Document-level rules; they run for admin, REST, MCP and seed writes alike. Called from register(). */
export function registerDocumentMiddlewares(strapi: Core.Strapi) {
  strapi.documents.use(slug);
  strapi.documents.use(normalizeContact);
  strapi.documents.use(scheduleValidate);
  strapi.documents.use(pricingValidate);
  strapi.documents.use(cityValidate);
}
