import { defineConfig } from 'cypress';
import { normalizarUrl, resolverUrls } from './cypress/config/ambiente';

const urls = resolverUrls();

export default defineConfig({
  expose: {
    apiUrl: urls.apiUrl,
  },
  e2e: {
    baseUrl: urls.webUrl,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: false,
    video: false,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 0,
      openMode: 0,
    },
    defaultCommandTimeout: 8000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 20000,
    setupNodeEvents(_on, config) {
      const baseUrl = config.baseUrl ?? urls.webUrl;
      config.baseUrl = normalizarUrl(baseUrl, 'baseUrl');

      const atual: unknown = config.expose.apiUrl;
      const apiUrl = typeof atual === 'string' && atual.trim().length > 0 ? atual : urls.apiUrl;
      config.expose.apiUrl = normalizarUrl(apiUrl, 'apiUrl');
      return config;
    },
  },
});
