import { faker } from '@faker-js/faker';
import { tokenSeEmitido } from './corpo';

export function lembrar(destino: string[], valor: unknown): void {
  if (typeof valor !== 'string' || valor.length === 0 || destino.includes(valor)) {
    return;
  }

  destino.push(valor);
}

function anotar(
  falhas: string[],
  metodo: string,
  recurso: string,
  status: number,
  esperado: number,
): void {
  const resultado = `${metodo} ${recurso} → ${String(status)}`;
  Cypress.log({ name: 'limpeza', message: resultado });
  if (status !== esperado) {
    falhas.push(resultado);
  }
}

function anotarFalha(falhas: string[], mensagem: string): void {
  Cypress.log({ name: 'limpeza', message: mensagem });
  falhas.push(mensagem);
}

export function concluirLimpeza(estado: string | undefined, falhas: readonly string[]): void {
  cy.then(() => {
    if (estado !== 'passed' || falhas.length === 0) {
      return;
    }

    expect(falhas, 'limpeza incompleta').to.have.length(0);
  });
}

export function excluirUsuario(api: string, id: string, falhas: string[]): void {
  cy.request({
    method: 'DELETE',
    url: `${api}/usuarios/${encodeURIComponent(id)}`,
    failOnStatusCode: false,
    log: false,
  }).then((resposta) => {
    anotar(falhas, 'DELETE', `/usuarios/${id}`, resposta.status, 200);
  });
}

export function excluirUsuarioPendente(
  api: string,
  id: string | undefined,
  jaRemovido: boolean,
  falhas: string[],
): void {
  if (id === undefined || jaRemovido) {
    return;
  }

  excluirUsuario(api, id, falhas);
}

export function excluirProdutos(
  api: string,
  ids: readonly string[],
  token: string | undefined,
  falhas: string[],
): void {
  const lista = [...ids];
  if (lista.length === 0) {
    return;
  }

  if (token === undefined) {
    for (const id of lista) {
      anotarFalha(falhas, `DELETE /produtos/${id} não executado: sem token`);
    }
    return;
  }

  for (const id of lista) {
    cy.request({
      method: 'DELETE',
      url: `${api}/produtos/${encodeURIComponent(id)}`,
      headers: { Authorization: token },
      failOnStatusCode: false,
      log: false,
    }).then((resposta) => {
      anotar(falhas, 'DELETE', `/produtos/${id}`, resposta.status, 200);
    });
  }
}

export function excluirUsuarios(api: string, ids: readonly string[], falhas: string[]): void {
  for (const id of [...ids]) {
    excluirUsuario(api, id, falhas);
  }
}

// O DELETE de produto exige administrador. Este caminho só roda se o cenário
// capturou um id que não deveria existir e o próprio teste não tem token.
export function excluirProdutosIndevidos(
  api: string,
  ids: readonly string[],
  falhas: string[],
): void {
  const lista = [...ids];
  if (lista.length === 0) {
    return;
  }

  const administrador = {
    nome: faker.person.fullName(),
    email: `limpeza.${faker.string.uuid()}@teste.qa`,
    password: faker.internet.password({ length: 12 }),
    administrador: 'true' as const,
  };

  cy.request<{ _id?: string }>({
    method: 'POST',
    url: `${api}/usuarios`,
    body: administrador,
    failOnStatusCode: false,
    log: false,
  }).then((cadastro) => {
    anotar(falhas, 'POST', '/usuarios', cadastro.status, 201);
    const usuarioId = typeof cadastro.body._id === 'string' ? cadastro.body._id : undefined;
    if (usuarioId === undefined) {
      anotarFalha(falhas, 'POST /usuarios sem identificador');
      return;
    }

    cy.request<{ authorization?: string }>({
      method: 'POST',
      url: `${api}/login`,
      body: { email: administrador.email, password: administrador.password },
      failOnStatusCode: false,
      log: false,
    }).then((login) => {
      anotar(falhas, 'POST', '/login', login.status, 200);
      const token = tokenSeEmitido(login.body.authorization);
      if (token === undefined) {
        for (const id of lista) {
          anotarFalha(falhas, `DELETE /produtos/${id} não executado: sem token`);
        }
        excluirUsuario(api, usuarioId, falhas);
        return;
      }

      excluirProdutos(api, lista, token, falhas);
      excluirUsuario(api, usuarioId, falhas);
    });
  });
}
