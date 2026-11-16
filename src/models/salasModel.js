const db = require("../database/db");

// Remove o gabarito ("correta") ao enviar a questão para o aluno
function sanitizarSalaPublica(row) {
  if (!row) return null;
  if (row.questao && typeof row.questao === "object") {
    const { correta, ...questaoSemGabarito } = row.questao;
    return { ...row, questao: questaoSemGabarito };
  }
  return row;
}

// Filtra estritamente os campos permitidos no JSONB (evita Mass Assignment / poluição de objeto)
function normalizarQuestaoParaBanco(modoPalestra, questao) {
  if (!modoPalestra || !questao || typeof questao !== "object") {
    return null;
  }

  return JSON.stringify({
    pergunta: String(questao.pergunta || "").trim(),
    alternativas: {
      A: String(questao.alternativas?.A || "").trim(),
      B: String(questao.alternativas?.B || "").trim(),
      C: String(questao.alternativas?.C || "").trim(),
      D: String(questao.alternativas?.D || "").trim(),
      E: String(questao.alternativas?.E || "").trim(),
    },
    correta: String(questao.correta || "").trim(),
  });
}

async function listarSalas() {
  const resultado = await db.query(`
    SELECT
      sala_id AS "salaId",
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    FROM salas
    WHERE ativa = true
    ORDER BY sala_id
  `);

  return resultado.rows.map(sanitizarSalaPublica);
}

async function listarTodasSalas() {
  const resultado = await db.query(`
    SELECT
      sala_id AS "salaId",
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    FROM salas
    ORDER BY sala_id
  `);

  return resultado.rows;
}

async function buscarSalaPorId(salaId) {
  const resultado = await db.query(
    `
    SELECT
      sala_id AS "salaId",
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    FROM salas
    WHERE sala_id = $1
    `,
    [salaId]
  );

  return resultado.rows[0] || null;
}

async function cadastrarSala(dadosSala) {
  const modoPalestra = Boolean(dadosSala.modoPalestra);
  const questao = normalizarQuestaoParaBanco(modoPalestra, dadosSala.questao);

  const resultado = await db.query(
    `
    INSERT INTO salas (sala, pontos, icone, descricao, modo_palestra, questao)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING
      sala_id AS "salaId",
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    `,
    [
      String(dadosSala.sala).trim(),
      Number(dadosSala.pontos),
      String(dadosSala.icone || "map-pin").trim(),
      String(dadosSala.descricao || "").trim(),
      modoPalestra,
      questao,
    ]
  );

  return resultado.rows[0];
}

async function atualizarSala(salaId, dadosSala) {
  const modoPalestra = Boolean(dadosSala.modoPalestra);
  const questao = normalizarQuestaoParaBanco(modoPalestra, dadosSala.questao);

  const resultado = await db.query(
    `
    UPDATE salas
    SET
      sala = $1,
      pontos = $2,
      icone = $3,
      descricao = $4,
      ativa = $5,
      modo_palestra = $6,
      questao = $7::jsonb
    WHERE sala_id = $8
    RETURNING
      sala_id AS "salaId",
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    `,
    [
      String(dadosSala.sala).trim(),
      Number(dadosSala.pontos),
      String(dadosSala.icone || "map-pin").trim(),
      String(dadosSala.descricao || "").trim(),
      Boolean(dadosSala.ativa),
      modoPalestra,
      questao,
      salaId,
    ]
  );

  return resultado.rows[0] || null;
}

async function removerSala(salaId) {
  const resultado = await db.query(
    `
    DELETE FROM salas
    WHERE sala_id = $1
    RETURNING
      sala_id AS "salaId",
      sala,
      pontos,
      icone,
      descricao,
      ativa
    `,
    [salaId]
  );

  return resultado.rows[0] || null;
}

async function bloquear_leitura(salaID, bloquearLeitura, bloqueadaAte) {
  const resultado = await db.query(
    `
    UPDATE salas
    SET
      bloquear_leitura = $1,
      bloqueada_ate = $2
    WHERE sala_id = $3
    RETURNING
      sala_id AS "salaId",
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    `,
    [bloquearLeitura, bloqueadaAte, salaID]
  );

  return resultado.rows[0] || null;
}

module.exports = {
  listarSalas,
  listarTodasSalas,
  buscarSalaPorId,
  cadastrarSala,
  atualizarSala,
  removerSala,
  bloquear_leitura,
};