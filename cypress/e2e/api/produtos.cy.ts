import { dadosProduto } from '../../support/dados';
import { concluirLimpeza, excluirProdutosIndevidos, lembrar } from '../../support/limpeza';
import { urlDaApi } from '../../support/url';

interface ListaProdutos {
  quantidade?: number;
  produtos?: { nome?: string; _id?: string }[];
}

describe('API-03 — Proteção do cadastro de produtos', () => {
  const produtosIndevidos: string[] = [];
  const apiUrl = urlDaApi();

  afterEach(function () {
    const falhas: string[] = [];
    excluirProdutosIndevidos(apiUrl, produtosIndevidos, falhas);
    concluirLimpeza(this.currentTest?.state, falhas);
  });

  it('rejeita cadastro sem token e não persiste o produto', () => {
    const produto = dadosProduto();

    cy.request<ListaProdutos>({
      method: 'GET',
      url: `${apiUrl}/produtos`,
      qs: { nome: produto.nome },
      failOnStatusCode: false,
      log: false,
    })
      .then((antes) => {
        expect(antes.status, 'consulta inicial').to.eq(200);
        expect(antes.body.quantidade, 'produto ainda não existe').to.eq(0);
        expect(antes.body.produtos, 'lista inicial').to.eql([]);

        return cy.request<{ message?: string; _id?: string }>({
          method: 'POST',
          url: `${apiUrl}/produtos`,
          body: produto,
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((rejeicao) => {
        lembrar(produtosIndevidos, rejeicao.body._id);

        expect(rejeicao.status, 'cadastro sem token').to.eq(401);
        expect(rejeicao.body.message, 'mensagem de rejeição').to.eq(
          'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais',
        );
        expect(rejeicao.body, 'resposta sem produto criado').to.not.have.property('_id');

        return cy.request<ListaProdutos>({
          method: 'GET',
          url: `${apiUrl}/produtos`,
          qs: { nome: produto.nome },
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((depois) => {
        const produtos = depois.body.produtos;
        if (Array.isArray(produtos)) {
          for (const item of produtos) {
            if (item.nome === produto.nome) {
              lembrar(produtosIndevidos, item._id);
            }
          }
        }

        expect(depois.status, 'consulta posterior').to.eq(200);
        expect(depois.body.quantidade, 'quantidade após a rejeição').to.eq(0);
        expect(produtos, 'lista após a rejeição').to.eql([]);
      });
  });
});
