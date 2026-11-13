const db = require("../database/db");

async function listarSalas() {
  const resultado = await db.query(`
        SELECT
            sala_id AS "salaId",
            sala,
            pontos,
            icone,
            descricao,
            ativa
        FROM salas
        WHERE ativa = true
        ORDER BY sala_id
    `);

  return resultado.rows;
}

async function listarTodasSalas() {
  const resultado = await db.query(`
        SELECT
            sala_id AS "salaId",
            sala,
            pontos,
            icone,
            descricao,
            ativa
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
            ativa
        FROM salas
        WHERE sala_id = $1
        `,
    [salaId],
  );

  return resultado.rows[0] || null;
}

async function cadastrarSala(dadosSala) {
  const resultado = await db.query(
    `
        INSERT INTO salas (sala, pontos, icone, descricao)
        VALUES ($1, $2, $3, $4)
        RETURNING
            sala_id AS "salaId",
            sala,
            pontos,
            icone,
            descricao,
            ativa
        `,
    [
      dadosSala.sala,
      dadosSala.pontos,
      dadosSala.icone || "map-pin",
      dadosSala.descricao || "",
    ],
  );

  return resultado.rows[0];
}

async function atualizarSala(salaId, dadosSala) {
  const resultado = await db.query(
    `
        UPDATE salas
        SET
            sala = $1,
            pontos = $2,
            icone = $3,
            descricao = $4,
            ativa = $5
        WHERE sala_id = $6
        RETURNING
            sala_id AS "salaId",
            sala,
            pontos,
            icone,
            descricao,
            ativa
        `,
    [
      dadosSala.sala,
      dadosSala.pontos,
      dadosSala.icone || "map-pin",
      dadosSala.descricao || "",
      dadosSala.ativa,
      salaId,
    ],
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
    [salaId],
  );

  return resultado.rows[0] || null;
}

async function bloquear_leitura(salaID, bloquear_leitura, bloqueada_ate) {
  const resultado = await db.query(
    `UPDATE salas
        SET
            bloquear_leitura = $2,
            bloqueada_ate = $3   
        WHERE sala_id = $1 
        RETURNING
            sala_id,
            bloquear_leitura,
            bloqueada_ate;`,
        [salaID, bloquear_leitura, bloqueada_ate],
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
