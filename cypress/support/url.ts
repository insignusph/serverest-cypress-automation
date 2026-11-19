export function urlDaApi(): string {
  const valor: unknown = Cypress.expose('apiUrl');
  if (typeof valor !== 'string' || valor.length === 0) {
    throw new Error('apiUrl não foi exposta. A normalização fica em cypress.config.ts.');
  }

  return valor;
}

export function origemDe(url: string): string {
  return new URL(url).origin;
}
