import { corpoJson, exigirResposta, ID_RECURSO } from '../../support/corpo';
import { usuarioComum } from '../../support/dados';
import { concluirLimpeza, excluirUsuario } from '../../support/limpeza';
import { origemDe, urlDaApi } from '../../support/url';

const MENSAGEM_CREDENCIAL_INVALIDA = 'Email e/ou senha inválidos';

function mensagemNaInterface(mensagem: string): string {
  return mensagem.charAt(0).toUpperCase() + mensagem.slice(1).toLowerCase();
}

describe('FE-02 — Autenticação inválida', () => {
  let usuarioId: string | undefined;
  let apiDoCadastro: string | undefined;
  let textoNaInterface = '';

  afterEach(function () {
    const falhas: string[] = [];
    if (usuarioId !== undefined && apiDoCadastro !== undefined) {
      excluirUsuario(apiDoCadastro, usuarioId, falhas);
    }
    concluirLimpeza(this.currentTest?.state, falhas);
  });

  it('rejeita credenciais inválidas e não concede acesso administrativo', () => {
    const usuario = usuarioComum();
    const senhaIncorreta = `${usuario.password}-invalida`;
    const apiConfigurada = origemDe(urlDaApi());

    cy.request<{ message?: string; _id?: string }>({
      method: 'POST',
      url: `${apiConfigurada}/usuarios`,
      body: usuario,
      failOnStatusCode: false,
      log: false,
    }).then((cadastro) => {
      const id = cadastro.body._id;
      if (typeof id === 'string') {
        usuarioId = id;
        apiDoCadastro = apiConfigurada;
      }

      expect(cadastro.status, 'cadastro do usuário comum').to.eq(201);
      expect(cadastro.body.message, 'mensagem do cadastro').to.eq('Cadastro realizado com sucesso');
      expect(id, '_id').to.match(ID_RECURSO);
    });

    cy.intercept('POST', '**/login').as('login');
    cy.visit('/login', {
      onBeforeLoad(janela) {
        janela.localStorage.clear();
      },
    });
    cy.window().then((janela) => {
      expect(semToken(janela), 'sessão limpa').to.eq(true);
    });

    cy.get('[data-testid="email"]')
      .clear()
      .type(usuario.email, { parseSpecialCharSequences: false });
    cy.get('[data-testid="senha"]').clear().type(senhaIncorreta, {
      log: false,
      parseSpecialCharSequences: false,
    });
    cy.get('[data-testid="entrar"]').click();

    cy.wait('@login').then((intercepcao) => {
      const resposta = exigirResposta(intercepcao.response);
      const enviado = corpoJson(intercepcao.request.body);
      const recebido = corpoJson(resposta.body);
      const mensagem = typeof recebido.message === 'string' ? recebido.message : '';
      textoNaInterface = mensagemNaInterface(mensagem);

      expect(origemDe(intercepcao.request.url), 'backend do front').to.eq(apiConfigurada);
      expect(enviado.email, 'e-mail enviado').to.eq(usuario.email);
      expect(enviado.password === senhaIncorreta, 'senha enviada é a senha incorreta').to.eq(true);
      expect(enviado.password === usuario.password, 'senha real não foi enviada').to.eq(false);
      expect(resposta.statusCode, 'status do login').to.eq(401);
      expect(mensagem, 'mensagem da API').to.eq(MENSAGEM_CREDENCIAL_INVALIDA);
      expect(recebido.authorization === undefined, 'resposta sem token de autorização').to.eq(true);
    });

    cy.get('.alert').should(($alerta) => {
      expect($alerta.text(), 'mensagem na interface').to.include(textoNaInterface);
    });
    cy.window().then((janela) => {
      expect(semToken(janela), 'sessão sem token').to.eq(true);
      expect(
        janela.localStorage.getItem('serverest/userEmail'),
        'sessão sem e-mail autenticado',
      ).to.eq(null);
    });

    cy.visit('/admin/home');
    cy.location('pathname').should('eq', '/login');
    cy.get('[data-testid="entrar"]').should('be.visible');
    cy.get('[data-testid="cadastrarUsuarios"]').should('not.exist');
    cy.window().then((janela) => {
      expect(semToken(janela), 'acesso administrativo sem token').to.eq(true);
    });
  });
});

function semToken(janela: Window): boolean {
  return janela.localStorage.getItem('serverest/userToken') === null;
}
