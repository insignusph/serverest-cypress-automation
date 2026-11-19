import { ID_RECURSO } from '../../support/corpo';
import { usuarioComum } from '../../support/dados';
import { concluirLimpeza, excluirUsuarioPendente } from '../../support/limpeza';
import { urlDaApi } from '../../support/url';

describe('API-01 — Ciclo de vida de usuário', () => {
  let usuarioId: string | undefined;
  let usuarioRemovido = false;
  const apiUrl = urlDaApi();

  function idDoCenario(): string {
    if (usuarioId === undefined) {
      throw new Error('A API não devolveu o identificador do usuário criado.');
    }

    return usuarioId;
  }

  afterEach(function () {
    const falhas: string[] = [];
    excluirUsuarioPendente(apiUrl, usuarioId, usuarioRemovido, falhas);
    concluirLimpeza(this.currentTest?.state, falhas);
  });

  it('cria, consulta, exclui e confirma a ausência do usuário', () => {
    const usuario = usuarioComum();

    cy.request<{ message?: string; _id?: string }>({
      method: 'POST',
      url: `${apiUrl}/usuarios`,
      body: usuario,
      failOnStatusCode: false,
      log: false,
    })
      .then((cadastro) => {
        const id = cadastro.body._id;
        if (typeof id === 'string' && id.length > 0) {
          usuarioId = id;
        }

        expect(cadastro.status, 'POST /usuarios').to.eq(201);
        expect(cadastro.body.message, 'mensagem de cadastro').to.eq(
          'Cadastro realizado com sucesso',
        );
        expect(cadastro.body._id, '_id').to.match(ID_RECURSO);

        return cy.request<{
          nome?: string;
          email?: string;
          administrador?: string;
          _id?: string;
        }>({
          method: 'GET',
          url: `${apiUrl}/usuarios/${encodeURIComponent(idDoCenario())}`,
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((consulta) => {
        const id = idDoCenario();

        expect(consulta.status, 'GET /usuarios/{_id}').to.eq(200);
        expect(consulta.body.nome, 'nome').to.eq(usuario.nome);
        expect(consulta.body.email, 'e-mail').to.eq(usuario.email);
        expect(consulta.body.administrador, 'perfil').to.eq(usuario.administrador);
        expect(consulta.body._id, '_id consultado').to.eq(id);

        return cy.request<{ message?: string }>({
          method: 'DELETE',
          url: `${apiUrl}/usuarios/${encodeURIComponent(id)}`,
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((exclusao) => {
        const id = idDoCenario();

        if (exclusao.status === 200) {
          usuarioRemovido = true;
        }

        expect(exclusao.status, 'DELETE /usuarios/{_id}').to.eq(200);
        expect(exclusao.body.message, 'mensagem de exclusão').to.eq(
          'Registro excluído com sucesso',
        );

        return cy.request<{ message?: string }>({
          method: 'GET',
          url: `${apiUrl}/usuarios/${encodeURIComponent(id)}`,
          failOnStatusCode: false,
          log: false,
        });
      })
      .then((ausencia) => {
        expect(ausencia.status, 'GET do usuário excluído').to.eq(400);
        expect(ausencia.body.message, 'mensagem de ausência').to.eq('Usuário não encontrado');
      });
  });
});
