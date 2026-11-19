import path from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginCypress from 'eslint-plugin-cypress';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'package-lock.json',
      'cypress/videos/**',
      'cypress/screenshots/**',
      'cypress/downloads/**',
      'cypress/reports/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
  },
  {
    files: ['cypress/**/*.ts', 'cypress.config.ts'],
    extends: [pluginCypress.configs.recommended],
    rules: {
      // Chainable é thenable; o await implícito do Cypress não é uma promise esquecida.
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['cypress/e2e/frontend/**/*.ts'],
    rules: {
      // Os inputs do ServeRest não têm value controlado. clear().type() age no mesmo
      // nó e o Cypress conclui o clear antes do type. A regra proíbe qualquer ação
      // no meio da cadeia, inclusive esse par. click().click() continua separado.
      'cypress/unsafe-to-chain-command': 'off',
    },
  },
  eslintConfigPrettier,
);
