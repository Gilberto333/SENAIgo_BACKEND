const crypto = require("crypto");
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

function gerarQrToken(eventoId) {
  const sufixo = crypto.randomBytes(6).toString("hex");
  return eventoId ? `EVT_${eventoId}_${sufixo}` : `SALA_${sufixo}`;
}

async function listarSalas(eventoId = null) {
  const params = [];
  let where = "WHERE ativa = true";

  if (eventoId) {
    params.push(eventoId);
    where += ` AND evento_id = $${params.length}`;
  }

  const resultado = await db.query(
    `
    SELECT
      sala_id AS id,
      sala_id,
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    FROM salas
    ${where}
    ORDER BY sala_id ASC
    `,
    params
  );

  return resultado.rows.map(sanitizarSalaPublica);
}

async function listarTodasSalas(eventoId = null) {
  const params = [];
  const where = eventoId ? (params.push(eventoId), `WHERE evento_id = $1`) : "";

  const resultado = await db.query(
    `
    SELECT
      sala_id AS id,
      sala_id,
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    FROM salas
    ${where}
    ORDER BY sala_id ASC
    `,
    params
  );

  return resultado.rows;
}

async function buscarSalaPorId(salaId) {
  const resultado = await db.query(
    `
    SELECT
      sala_id AS id,
      sala_id,
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token,
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

async function buscarSalaPorToken(qrToken, eventoId = null) {
  const params = [qrToken];
  let where = "WHERE qr_token = $1";

  if (eventoId) {
    params.push(eventoId);
    where += ` AND evento_id = $${params.length}`;
  }

  const resultado = await db.query(
    `
    SELECT
      sala_id AS id,
      sala_id,
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    FROM salas
    ${where}
    `,
    params
  );

  return resultado.rows[0] || null;
}

async function cadastrarSala(dadosSala) {
  const eventoId = dadosSala.eventoId || dadosSala.evento_id || null;
  const modoPalestra = Boolean(dadosSala.modoPalestra);
  const questao = normalizarQuestaoParaBanco(modoPalestra, dadosSala.questao);
  const qrToken = dadosSala.qr_token || dadosSala.qrToken || gerarQrToken(eventoId);

  const resultado = await db.query(
    `
    INSERT INTO salas (
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token,
      modo_palestra,
      questao
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    RETURNING
      sala_id AS id,
      sala_id,
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    `,
    [
      eventoId,
      String(dadosSala.sala).trim(),
      Number(dadosSala.pontos),
      String(dadosSala.icone || "map-pin").trim(),
      String(dadosSala.descricao || "").trim(),
      dadosSala.ativa !== undefined ? Boolean(dadosSala.ativa) : true,
      qrToken,
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
      sala_id AS id,
      sala_id,
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token,
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
      sala_id AS id,
      sala_id,
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token
    `,
    [salaId]
  );

  return resultado.rows[0] || null;
}

async function bloquear_leitura(salaId, bloquearLeitura, bloqueadaAte) {
  const resultado = await db.query(
    `
    UPDATE salas
    SET
      bloquear_leitura = $1,
      bloqueada_ate = $2
    WHERE sala_id = $3
    RETURNING
      sala_id AS id,
      sala_id,
      evento_id,
      sala,
      pontos,
      icone,
      descricao,
      ativa,
      qr_token,
      bloquear_leitura,
      bloqueada_ate,
      modo_palestra AS "modoPalestra",
      questao
    `,
    [bloquearLeitura, bloqueadaAte, salaId]
  );

  return resultado.rows[0] || null;
}

module.exports = {
  listarSalas,
  listarTodasSalas,
  buscarSalaPorId,
  buscarSalaPorToken,
  cadastrarSala,
  atualizarSala,
  removerSala,
  bloquear_leitura,
};