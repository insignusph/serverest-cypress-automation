import { ID_RECURSO, tokenSeEmitido } from '../../support/corpo';
import { dadosProduto, usuarioAdministrador, usuarioComum } from '../../support/dados';
import { concluirLimpeza, excluirProdutos, excluirUsuarios, lembrar } from '../../support/limpeza';
import { urlDaApi } from '../../support/url';

describe('API-02 — Autenticação e autorização por perfil', () => {
  const usuariosCriados: string[] = [];
  const produtosCriados: string[] = [];
  let tokenAdmin: string | undefined;
  let idProdutoAdministrador: string | undefined;
  const apiUrl = urlDaApi();

  afterEach(function () {
    const falhas: string[] = [];
    excluirProdutos(apiUrl, produtosCriados, tokenAdmin, falhas);
    excluirUsuarios(apiUrl, usuariosCriados, falhas);
    concluirLimpeza(this.currentTest?.state, falhas);
  });

  it('autentica administrador e usuário comum, restringe produto e rejeita senha inválida', () => {
    const administrador = usuarioAdministrador();
    const comum = usuarioComum();
    const produtoAdmin = dadosProduto();
    const produtoProibido = dadosProduto();

    cy.request<{ message?: string; _id?: string }>({
      method: 'POST',
      url: `${apiUrl}/usuarios`,
      body: administrador,
      failOnStatusCode: false,
      log: false,
    })
      .then((cadastroAdmin) => {
        lembrar(usuariosCriados, cadastroAdmin.body._id);

        expect(cadastroAdmin.status, 'cadastro do administrador').to.eq(201);
        expect(cadastroAdmin.body._id, 'id do administrador').to.match(ID_RECURSO);

        return cy.request<{ message?: string; _id?: string }>({
          method: 'POST',
          url: `${apiUrl}/usuarios`,
          body: comum,
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((cadastroComum) => {
        lembrar(usuariosCriados, cadastroComum.body._id);

        expect(cadastroComum.status, 'cadastro do usuário comum').to.eq(201);
        expect(cadastroComum.body._id, 'id do usuário comum').to.match(ID_RECURSO);

        return cy.request<{ message?: string; authorization?: string }>({
          method: 'POST',
          url: `${apiUrl}/login`,
          body: { email: administrador.email, password: administrador.password },
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((loginAdmin) => {
        const autorizacao = tokenSeEmitido(loginAdmin.body.authorization);
        if (autorizacao !== undefined) {
          tokenAdmin = autorizacao;
        }

        expect(loginAdmin.status, 'login do administrador').to.eq(200);
        expect(loginAdmin.body.message, 'mensagem do administrador').to.eq(
          'Login realizado com sucesso',
        );
        expect(autorizacao !== undefined, 'token do administrador presente').to.eq(true);
        if (autorizacao === undefined) {
          throw new Error('Token de administrador ausente.');
        }

        return cy.request<{ message?: string; _id?: string }>({
          method: 'POST',
          url: `${apiUrl}/produtos`,
          body: produtoAdmin,
          headers: { Authorization: autorizacao },
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((cadastroProduto) => {
        const id = cadastroProduto.body._id;
        lembrar(produtosCriados, id);
        if (typeof id === 'string') {
          idProdutoAdministrador = id;
        }

        expect(cadastroProduto.status, 'cadastro de produto pelo administrador').to.eq(201);
        expect(cadastroProduto.body.message, 'mensagem do produto').to.eq(
          'Cadastro realizado com sucesso',
        );
        expect(id, 'id do produto').to.match(ID_RECURSO);
        if (typeof id !== 'string') {
          throw new Error('A API não devolveu o identificador do produto.');
        }

        return cy.request<{
          nome?: string;
          preco?: number;
          descricao?: string;
          quantidade?: number;
          _id?: string;
        }>({
          method: 'GET',
          url: `${apiUrl}/produtos/${encodeURIComponent(id)}`,
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((produto) => {
        expect(produto.status, 'consulta do produto').to.eq(200);
        expect(produto.body.nome, 'nome do produto').to.eq(produtoAdmin.nome);
        expect(produto.body.preco, 'preço').to.eq(produtoAdmin.preco);
        expect(produto.body.descricao, 'descrição').to.eq(produtoAdmin.descricao);
        expect(produto.body.quantidade, 'quantidade').to.eq(produtoAdmin.quantidade);
        expect(produto.body._id, 'id consultado').to.eq(idProdutoAdministrador);

        return cy.request<{ message?: string; authorization?: string }>({
          method: 'POST',
          url: `${apiUrl}/login`,
          body: { email: comum.email, password: comum.password },
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((loginComum) => {
        const token = tokenSeEmitido(loginComum.body.authorization);

        expect(loginComum.status, 'login do usuário comum').to.eq(200);
        expect(loginComum.body.message, 'mensagem do usuário comum').to.eq(
          'Login realizado com sucesso',
        );
        expect(token !== undefined, 'token do usuário comum presente').to.eq(true);
        if (token === undefined) {
          throw new Error('Token do usuário comum ausente.');
        }

        return cy.request<{ message?: string; _id?: string }>({
          method: 'POST',
          url: `${apiUrl}/produtos`,
          body: produtoProibido,
          headers: { Authorization: token },
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((proibido) => {
        lembrar(produtosCriados, proibido.body._id);

        expect(proibido.status, 'produto pelo usuário comum').to.eq(403);
        expect(proibido.body.message, 'rejeição de autorização').to.eq(
          'Rota exclusiva para administradores',
        );
        expect(proibido.body, 'produto não criado').to.not.have.property('_id');

        return cy.request<{
          quantidade?: number;
          produtos?: { nome?: string; _id?: string }[];
        }>({
          method: 'GET',
          url: `${apiUrl}/produtos`,
          qs: { nome: produtoProibido.nome },
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((lista) => {
        const produtos = lista.body.produtos;
        if (Array.isArray(produtos)) {
          for (const item of produtos) {
            if (item.nome === produtoProibido.nome) {
              lembrar(produtosCriados, item._id);
            }
          }
        }

        expect(lista.status, 'consulta do produto proibido').to.eq(200);
        expect(lista.body.quantidade, 'quantidade do produto proibido').to.eq(0);
        expect(produtos, 'lista do produto proibido').to.eql([]);

        return cy.request<{ message?: string; authorization?: string }>({
          method: 'POST',
          url: `${apiUrl}/login`,
          body: { email: comum.email, password: `${comum.password}-invalida` },
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((rejeicao) => {
        expect(rejeicao.status, 'senha inválida').to.eq(401);
        expect(rejeicao.body.message, 'mensagem de credencial inválida').to.eq(
          'Email e/ou senha inválidos',
        );
        expect(
          tokenSeEmitido(rejeicao.body.authorization) === undefined,
          'token não concedido',
        ).to.eq(true);
      });
  });
});
