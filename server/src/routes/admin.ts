export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/generate',
      handler: 'controller.generate',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/apply',
      handler: 'controller.apply',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'controller.getSettings',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
