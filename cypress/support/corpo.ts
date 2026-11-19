export const ID_RECURSO = /^[a-zA-Z0-9]{16}$/;

const TOKEN = /^Bearer \S+$/;

export function corpoJson(valor: unknown): Record<string, unknown> {
  if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
    return valor as Record<string, unknown>;
  }

  throw new Error('O corpo interceptado não é um objeto JSON.');
}

export function exigirResposta<T>(resposta: T | undefined): T {
  if (resposta === undefined) {
    throw new Error('A requisição interceptada não devolveu resposta.');
  }

  return resposta;
}

export function tokenSeEmitido(valor: unknown): string | undefined {
  if (typeof valor === 'string' && TOKEN.test(valor)) {
    return valor;
  }

  return undefined;
}

export function tokenDoCabecalho(headers: unknown): string {
  if (typeof headers !== 'object' || headers === null) {
    return '';
  }

  const registro = headers as Record<string, unknown>;
  const bruto = registro.authorization;
  if (typeof bruto === 'string') {
    return bruto;
  }

  if (Array.isArray(bruto) && typeof bruto[0] === 'string') {
    return bruto[0];
  }

  return '';
}
