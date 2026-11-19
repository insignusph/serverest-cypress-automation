export interface UrlsDoAmbiente {
  webUrl: string;
  apiUrl: string;
}

const AMBIENTE_PUBLICO: UrlsDoAmbiente = {
  webUrl: 'https://front.serverest.dev',
  apiUrl: 'https://serverest.dev',
};

function semBarraFinal(url: string): string {
  return url.replace(/\/+$/, '');
}

export function normalizarUrl(valor: string, nome: string): string {
  const texto = valor.trim();
  if (texto.length === 0) {
    throw new Error(`${nome} está vazia.`);
  }

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new Error(`${nome} não é uma URL válida: ${texto}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${nome} precisa usar http ou https.`);
  }

  return semBarraFinal(texto);
}

/**
 * Resolve as URLs no processo do Node, antes do browser do Cypress.
 * O padrão é o ambiente público. CYPRESS_BASE_URL e CYPRESS_apiUrl
 * substituem web e API sem alterar o código. A URL da API segue para
 * `expose`, lida no browser por Cypress.expose.
 */
export function resolverUrls(env: NodeJS.ProcessEnv = process.env): UrlsDoAmbiente {
  const webInformada = env.CYPRESS_BASE_URL;
  const apiInformada = env.CYPRESS_apiUrl;

  return {
    webUrl: normalizarUrl(webInformada ?? AMBIENTE_PUBLICO.webUrl, 'CYPRESS_BASE_URL'),
    apiUrl: normalizarUrl(apiInformada ?? AMBIENTE_PUBLICO.apiUrl, 'CYPRESS_apiUrl'),
  };
}
