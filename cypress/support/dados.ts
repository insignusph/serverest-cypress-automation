import { faker } from '@faker-js/faker';

export interface Usuario {
  nome: string;
  email: string;
  password: string;
  administrador: 'true' | 'false';
}

export interface Produto {
  nome: string;
  preco: number;
  descricao: string;
  quantidade: number;
}

export function usuarioComum(): Usuario {
  return {
    nome: faker.person.fullName(),
    email: `qa.${faker.string.uuid()}@teste.qa`,
    password: faker.internet.password({ length: 12 }),
    administrador: 'false',
  };
}

export function usuarioAdministrador(): Usuario {
  return {
    nome: faker.person.fullName(),
    email: `admin.${faker.string.uuid()}@teste.qa`,
    password: faker.internet.password({ length: 12 }),
    administrador: 'true',
  };
}

export function dadosProduto(): Produto {
  return {
    nome: `Produto ${faker.string.uuid()}`,
    preco: faker.number.int({ min: 1, max: 500 }),
    descricao: `Descricao ${faker.string.uuid()}`,
    quantidade: faker.number.int({ min: 0, max: 20 }),
  };
}
