import { corpoJson, exigirResposta, ID_RECURSO } from '../../support/corpo';
import { usuarioComum } from '../../support/dados';
import { concluirLimpeza, excluirUsuario } from '../../support/limpeza';
import { origemDe, urlDaApi } from '../../support/url';

describe('FE-01 — Cadastro de usuário', () => {
  let usuarioId: string | undefined;
  let apiDoCadastro: string | undefined;

  afterEach(function () {
    const falhas: string[] = [];
    if (usuarioId !== undefined && apiDoCadastro !== undefined) {
      excluirUsuario(apiDoCadastro, usuarioId, falhas);
    }
    concluirLimpeza(this.currentTest?.state, falhas);
  });

  it('cadastra um usuário comum pela interface e confirma a persistência', () => {
    const usuario = usuarioComum();
    const apiConfigurada = origemDe(urlDaApi());

    cy.intercept('POST', '**/usuarios').as('cadastro');
    cy.visit('/cadastrarusuarios');

    cy.get('[data-testid="nome"]').clear().type(usuario.nome, { parseSpecialCharSequences: false });
    cy.get('[data-testid="email"]')
      .clear()
      .type(usuario.email, { parseSpecialCharSequences: false });
    cy.get('[data-testid="password"]').clear().type(usuario.password, {
      log: false,
      parseSpecialCharSequences: false,
    });
    cy.get('[data-testid="checkbox"]').uncheck();
    cy.get('[data-testid="checkbox"]').should('not.be.checked');
    cy.get('[data-testid="cadastrar"]').click();

    cy.wait('@cadastro')
      .then((intercepcao) => {
        const resposta = exigirResposta(intercepcao.response);
        const enviado = corpoJson(intercepcao.request.body);
        const recebido = corpoJson(resposta.body);
        const id = recebido._id;
        const origemCadastro = origemDe(intercepcao.request.url);

        if (typeof id === 'string') {
          usuarioId = id;
          apiDoCadastro = origemCadastro;
        }

        expect(enviado.nome, 'nome enviado').to.eq(usuario.nome);
        expect(enviado.email, 'e-mail enviado').to.eq(usuario.email);
        expect(enviado.password === usuario.password, 'senha enviada').to.eq(true);
        expect(enviado.administrador, 'perfil enviado').to.eq(usuario.administrador);
        expect(resposta.statusCode, 'status do cadastro').to.eq(201);
        expect(recebido.message, 'mensagem do cadastro').to.eq('Cadastro realizado com sucesso');
        expect(id, '_id').to.match(ID_RECURSO);
        expect(origemCadastro, 'backend do front').to.eq(apiConfigurada);
        if (typeof id !== 'string') {
          throw new Error('A API não devolveu o identificador do usuário criado.');
        }

        return cy.request<{
          nome?: string;
          email?: string;
          administrador?: string;
          _id?: string;
        }>({
          method: 'GET',
          url: `${origemCadastro}/usuarios/${encodeURIComponent(id)}`,
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((consulta) => {
        expect(consulta.status, 'consulta do usuário persistido').to.eq(200);
        expect(consulta.body.nome, 'nome persistido').to.eq(usuario.nome);
        expect(consulta.body.email, 'e-mail persistido').to.eq(usuario.email);
        expect(consulta.body.administrador, 'perfil persistido').to.eq(usuario.administrador);
        expect(consulta.body._id, 'id persistido').to.eq(usuarioId);
      });
  });
});
