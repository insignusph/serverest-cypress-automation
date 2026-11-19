# Mouts TI — Desafio Técnico QA

Suíte de testes de ponta a ponta do desafio técnico de QA da Mouts TI. O alvo é o ServeRest público: o [front](https://front.serverest.dev/) e a [API](https://serverest.dev/).

O desafio pede três cenários de API e três de interface, no mesmo repositório. Esta suíte cobre esses seis fluxos. Ela cria apenas dados próprios, com identificadores únicos, e remove somente o que o próprio cenário registrou.

## Tecnologias

- Node.js 20 ou superior
- Cypress 16
- TypeScript em modo strict
- ESLint, com `typescript-eslint` e `eslint-plugin-cypress`
- Prettier
- `@faker-js/faker` para a massa de dados

Não há aplicação própria, banco, Docker nem pipeline de CI neste repositório.

## Pré-requisitos

- Node.js 20 ou superior
- npm

O Cypress baixa o binário do Electron na instalação. A suíte usa esse navegador no modo headless. Não é preciso instalar Chrome.

## Instalação

Na raiz do repositório:

```bash
npm ci
```

`npm ci` instala exatamente o que está em `package-lock.json`.

## Execução

Suíte completa, sem interface:

```bash
npx cypress run
```

O mesmo comando está em `npm run cy:run`. Para abrir o Cypress e acompanhar os comandos:

```bash
npx cypress open
```

Atalhos equivalentes: `npm run cy:open`, `npm run cy:run:api` e `npm run cy:run:frontend`.

Retries estão desligados. Não há `cy.wait` com tempo fixo. Um vídeo não é gravado. Em falha, o Cypress salva screenshot em `cypress/screenshots/`, pasta ignorada pelo Git.

## Qualidade estática

```bash
npm run typecheck
npm run lint
npm run format:check
```

`npm run validate` executa os três. `npm run lint:fix` e `npm run format` aplicam as correções automáticas. O Prettier usa aspas simples, ponto e vírgula, vírgula final e fim de linha LF.

## Ambiente

| Superfície | URL padrão                    |
| ---------- | ----------------------------- |
| Front      | `https://front.serverest.dev` |
| API        | `https://serverest.dev`       |

A resolução fica em `cypress/config/ambiente.ts`. O front vira `baseUrl`. A API entra em `expose.apiUrl`, porque o Cypress 16 não oferece `Cypress.env()` no browser. As specs leem esse valor por `cypress/support/url.ts`.

Para apontar outro host, sem alterar código:

```powershell
$env:CYPRESS_BASE_URL = "https://front.serverest.dev"
$env:CYPRESS_apiUrl = "https://serverest.dev"
npx cypress run
```

Só a API também pode ser trocada na linha de comando:

```bash
npx cypress run --expose apiUrl=https://serverest.dev
```

Não há arquivo `.env` versionado. Credenciais fixas não são usadas: senha e e-mail nascem no Faker a cada execução.

## Cenários

| Spec                                  | O que verifica                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `cypress/e2e/api/usuarios.cy.ts`      | API-01. Cria um usuário comum, consulta os dados, exclui e confirma a ausência.                                |
| `cypress/e2e/api/autenticacao.cy.ts`  | API-02. Autentica administrador e usuário comum, permite produto ao admin, rejeita o comum e a senha inválida. |
| `cypress/e2e/api/produtos.cy.ts`      | API-03. Rejeita o cadastro de produto sem token e confirma que o produto não foi persistido.                   |
| `cypress/e2e/frontend/cadastro.cy.ts` | FE-01. Cadastra um usuário comum pela interface e confirma o mesmo registro na API.                            |
| `cypress/e2e/frontend/login.cy.ts`    | FE-02. Rejeita credenciais inválidas, não cria sessão e devolve a rota administrativa para o login.            |
| `cypress/e2e/frontend/produtos.cy.ts` | FE-03. Autentica um administrador pela interface, cadastra um produto e confirma a persistência.               |

As specs de API usam `cy.request()`. As de interface usam visita, formulário e `cy.intercept()`.

## Estrutura

```text
cypress.config.ts
cypress/
├── config/ambiente.ts          URLs do front e da API
├── support/
│   ├── e2e.ts                  suporte global, sem comandos customizados
│   ├── url.ts                  leitura da URL exposta da API
│   ├── corpo.ts                JSON interceptado, id e token sem imprimir o segredo
│   ├── dados.ts                usuário comum, administrador e produto válido
│   └── limpeza.ts              exclusão dos recursos criados pelo próprio cenário
└── e2e/
    ├── api/
    └── frontend/
```

Não há page objects, clientes de API nem factories genéricas. A requisição e o formulário ficam visíveis na spec.

## Dados e limpeza

`cypress/support/dados.ts` gera os objetos. Não chama o servidor. O e-mail, o nome do produto e a descrição levam um UUID. O campo `administrador` é a string `"true"` ou `"false"`. O preço é um inteiro de 1 a 500. A quantidade é um inteiro de 0 a 20.

Cada cenário guarda o id antes das assertivas. O `afterEach` exclui só esses ids. Produto é removido antes do usuário de quem o token depende. O DELETE de produto exige administrador; o de usuário, não. Se o API-03 observar um produto que não deveria existir, a limpeza cria um administrador exclusivo para apagá-lo e depois remove esse administrador.

Uma exclusão usa `failOnStatusCode: false` e não interrompe as demais. O status é anotado sem senha nem token. Se o cenário passou e alguma exclusão não devolveu o status esperado, a suíte falha numa assertiva única, depois de todas as tentativas. Se o cenário já falhou, a limpeza só registra o ocorrido e preserva o erro original. Um recurso já removido pelo próprio cenário não é excluído de novo.

## Decisões técnicas

- O contrato conferido é o do ServeRest público: mensagens, status e o formato do id. A senha é comparada por booleano, para não aparecer na mensagem da assertiva.
- O front e a API padrão apontam para o mesmo backend, `https://serverest.dev`. Os cenários de interface ainda comparam a origem interceptada com a `apiUrl` configurada e consultam essa origem.
- No cadastro de produto, o botão de envio do formulário é `cadastarProdutos`. `cadastrarProdutos` é o link da home do administrador. O campo de imagem não é `required`, e a API de produto não possui essa propriedade.
- A sessão do front fica em `serverest/userEmail`, `serverest/userToken` e `serverest/userPassword`. O Cypress limpa o `localStorage` entre testes.
- Os inputs do ServeRest não são controlados por `value`. Por isso `clear().type()` permanece na mesma cadeia nas specs de frontend. A regra `cypress/unsafe-to-chain-command` fica desligada só nesses arquivos.
- `Chainable` é thenable. `no-floating-promises` fica desligada nos arquivos do Cypress para não tratar a fila de comandos como promise esquecida.
- No modo interativo, o log de `cy.wait('@login')` pode mostrar o corpo da requisição, inclusive a senha. O payload enviado à aplicação não é alterado para esconder esse valor. O `cy.request` que carrega senha ou token usa `log: false`.
