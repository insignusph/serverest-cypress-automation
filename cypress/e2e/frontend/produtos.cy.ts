import {
  corpoJson,
  exigirResposta,
  ID_RECURSO,
  tokenDoCabecalho,
  tokenSeEmitido,
} from '../../support/corpo';
import { dadosProduto, usuarioAdministrador } from '../../support/dados';
import { concluirLimpeza, excluirProdutos, excluirUsuario } from '../../support/limpeza';
import { origemDe, urlDaApi } from '../../support/url';

describe('FE-03 — Cadastro de produto', () => {
  let usuarioId: string | undefined;
  let apiDoUsuario: string | undefined;
  let tokenAdmin: string | undefined;
  let produtoId: string | undefined;
  let apiDoProduto: string | undefined;

  afterEach(function () {
    const falhas: string[] = [];
    if (produtoId !== undefined && apiDoProduto !== undefined) {
      excluirProdutos(apiDoProduto, [produtoId], tokenAdmin, falhas);
    }
    if (usuarioId !== undefined && apiDoUsuario !== undefined) {
      excluirUsuario(apiDoUsuario, usuarioId, falhas);
    }
    concluirLimpeza(this.currentTest?.state, falhas);
  });

  it('cadastra um produto pela interface administrativa e confirma a persistência', () => {
    const administrador = usuarioAdministrador();
    const produto = dadosProduto();
    const apiConfigurada = origemDe(urlDaApi());

    cy.request<{ message?: string; _id?: string }>({
      method: 'POST',
      url: `${apiConfigurada}/usuarios`,
      body: administrador,
      failOnStatusCode: false,
      log: false,
    }).then((cadastro) => {
      const id = cadastro.body._id;
      if (typeof id === 'string') {
        usuarioId = id;
        apiDoUsuario = apiConfigurada;
      }

      expect(cadastro.status, 'cadastro do administrador').to.eq(201);
      expect(cadastro.body.message, 'mensagem do administrador').to.eq(
        'Cadastro realizado com sucesso',
      );
      expect(id, '_id do administrador').to.match(ID_RECURSO);
    });

    cy.intercept('POST', '**/login').as('login');
    cy.visit('/login', {
      onBeforeLoad(janela) {
        janela.localStorage.clear();
      },
    });
    cy.get('[data-testid="email"]').clear().type(administrador.email, {
      parseSpecialCharSequences: false,
    });
    cy.get('[data-testid="senha"]').clear().type(administrador.password, {
      log: false,
      parseSpecialCharSequences: false,
    });
    cy.get('[data-testid="entrar"]').click();

    cy.wait('@login').then((intercepcao) => {
      const resposta = exigirResposta(intercepcao.response);
      const enviado = corpoJson(intercepcao.request.body);
      const recebido = corpoJson(resposta.body);
      const autorizacao = tokenSeEmitido(recebido.authorization);
      if (autorizacao !== undefined) {
        tokenAdmin = autorizacao;
      }

      expect(origemDe(intercepcao.request.url), 'backend do login').to.eq(apiConfigurada);
      expect(enviado.email, 'e-mail enviado').to.eq(administrador.email);
      expect(enviado.password === administrador.password, 'senha do administrador enviada').to.eq(
        true,
      );
      expect(resposta.statusCode, 'status do login').to.eq(200);
      expect(recebido.message, 'mensagem do login').to.eq('Login realizado com sucesso');
      expect(autorizacao !== undefined, 'token de autorização presente').to.eq(true);
    });

    cy.location('pathname').should('eq', '/admin/home');
    cy.contains('Este é seu sistema para administrar seu ecommerce.').should('be.visible');
    cy.window().then((janela) => {
      const sessao = janela.localStorage.getItem('serverest/userToken');
      expect(tokenSeEmitido(sessao) !== undefined, 'sessão autenticada').to.eq(true);
      expect(janela.localStorage.getItem('serverest/userEmail'), 'e-mail da sessão').to.eq(
        administrador.email,
      );
    });

    cy.visit('/admin/cadastrarprodutos');
    cy.contains('h1', 'Cadastro de Produtos').should('be.visible');
    cy.get('[data-testid="cadastrarProdutos"]').should('not.exist');
    cy.get('[data-testid="cadastarProdutos"]').should(($botao) => {
      expect($botao, 'um único botão de envio').to.have.length(1);
      const elemento = $botao.get(0);
      if (elemento.closest('form') === null) {
        throw new Error('cadastarProdutos não é o botão de envio do formulário.');
      }
      expect(elemento.tagName, 'elemento de envio').to.eq('BUTTON');
      expect(elemento.getAttribute('type'), 'tipo do envio').to.eq('submit');
      expect(elemento.textContent.trim(), 'rótulo do envio').to.eq('Cadastrar');
    });

    cy.get('[data-testid="nome"]').clear().type(produto.nome, { parseSpecialCharSequences: false });
    cy.get('[data-testid="preco"]').clear().type(String(produto.preco));
    cy.get('[data-testid="descricao"]').clear().type(produto.descricao, {
      parseSpecialCharSequences: false,
    });
    cy.get('[data-testid="quantity"]').clear().type(String(produto.quantidade));
    cy.get('[data-testid="imagem"]').should(($campo) => {
      expect($campo, 'um único campo de imagem').to.have.length(1);
      const elemento = $campo.get(0);
      expect(elemento.tagName, 'campo de imagem').to.eq('INPUT');
      expect(elemento.getAttribute('type'), 'tipo do arquivo').to.eq('file');
      expect(elemento.hasAttribute('required'), 'imagem não obrigatória').to.eq(false);
    });

    cy.intercept('POST', '**/produtos').as('produto');
    cy.get('form [data-testid="cadastarProdutos"]').click();

    cy.wait('@produto')
      .then((cadastroProduto) => {
        const respostaProduto = exigirResposta(cadastroProduto.response);
        const corpoEnviado = corpoJson(cadastroProduto.request.body);
        const corpoRecebido = corpoJson(respostaProduto.body);
        const id = corpoRecebido._id;
        const origemProduto = origemDe(cadastroProduto.request.url);

        if (typeof id === 'string') {
          produtoId = id;
          apiDoProduto = origemProduto;
        }

        expect(origemProduto, 'backend do front').to.eq(apiConfigurada);
        expect(
          tokenSeEmitido(tokenDoCabecalho(cadastroProduto.request.headers)) !== undefined,
          'cadastro autenticado',
        ).to.eq(true);
        expect(corpoEnviado.nome, 'nome enviado').to.eq(produto.nome);
        expect(corpoEnviado.preco, 'preço enviado').to.eq(produto.preco);
        expect(corpoEnviado.descricao, 'descrição enviada').to.eq(produto.descricao);
        expect(corpoEnviado.quantidade, 'quantidade enviada').to.eq(produto.quantidade);
        expect(corpoEnviado.imagem === undefined, 'cadastro sem imagem').to.eq(true);
        expect(respostaProduto.statusCode, 'status do produto').to.eq(201);
        expect(corpoRecebido.message, 'mensagem do produto').to.eq(
          'Cadastro realizado com sucesso',
        );
        expect(id, 'id do produto').to.match(ID_RECURSO);
        if (typeof id !== 'string') {
          throw new Error('A API não devolveu o identificador do produto.');
        }

        cy.location('pathname').should('eq', '/admin/listarprodutos');

        return cy.request<{
          nome?: string;
          preco?: number;
          descricao?: string;
          quantidade?: number;
          _id?: string;
          imagem?: unknown;
        }>({
          method: 'GET',
          url: `${origemProduto}/produtos/${encodeURIComponent(id)}`,
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((consulta) => {
        const imagem = consulta.body.imagem;

        expect(consulta.status, 'consulta do produto').to.eq(200);
        expect(consulta.body.nome, 'nome persistido').to.eq(produto.nome);
        expect(consulta.body.preco, 'preço persistido').to.eq(produto.preco);
        expect(consulta.body.descricao, 'descrição persistida').to.eq(produto.descricao);
        expect(consulta.body.quantidade, 'quantidade persistida').to.eq(produto.quantidade);
        expect(consulta.body._id, 'id persistido').to.eq(produtoId);
        expect(
          imagem === undefined || imagem === null || imagem === '',
          'imagem não persistida',
        ).to.eq(true);
      });
  });
});
