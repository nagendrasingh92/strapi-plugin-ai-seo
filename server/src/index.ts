import type { Core } from '@strapi/strapi';
import routes from './routes';
import controller from './controllers/controller';
import service from './services/service';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {},
  bootstrap({ strapi }: { strapi: Core.Strapi }) {},
  routes,
  controllers: {
    controller,
  },
  services: {
    service,
  },
};
