const schema = {
  cadastro: {
    cpf: { obrigatorio: true, tipo: "string", min: 11, max: 11 },
    nome: { obrigatorio: true, tipo: "string", min: 3 },
    email: { obrigatorio: true, tipo: "string", email: true },
    senha: { obrigatorio: true, tipo: "string", min: 6 },
  },

  login: {
    email: { obrigatorio: true, email: true, tipo: "string" },
    senha: { obrigatorio: true, min: 6, tipo: "string" },
  },

  produto: {
    nome: { obrigatorio: true, tipo: "string", min: 3, max: 60 },
    imagem: { tipo: "string", max: 10 },
    pontos: { obrigatorio: true, tipo: "number", inteiro: true, minValor: 1 },
    estoque: { obrigatorio: true, tipo: "number", inteiro: true, minValor: 0 },
  },

  sala: {
    sala: { obrigatorio: true, tipo: "string", min: 3, max: 40 },
    descricao: { tipo: "string", max: 120 },
    icone: { tipo: "string", max: 20 },
    pontos: { obrigatorio: true, tipo: "number", inteiro: true, minValor: 1 },
    ativa: { tipo: "boolean" },
    modoPalestra: { tipo: "boolean" },
    questao: { tipo: "object" },
  },

  resgate: {
    produtoId: { obrigatorio: true, tipo: "number", inteiro: true, minValor: 1 },
  },
};

module.exports = schema;