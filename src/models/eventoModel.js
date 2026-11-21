const pool = require('../database/db');

const EventoModel = {
  async criar({ titulo, descricao, codigoConvite, criadorId }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const eventoRes = await client.query(
        `INSERT INTO eventos (titulo, descricao, codigo_convite, criador_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [titulo, descricao || null, codigoConvite, criadorId]
      );
      const evento = eventoRes.rows[0];

      // O criador já entra automaticamente como participante do grupo
      await client.query(
        `INSERT INTO evento_participantes (evento_id, usuario_id)
         VALUES ($1, $2)
         ON CONFLICT (evento_id, usuario_id) DO NOTHING`,
        [evento.id, criadorId]
      );

      await client.query('COMMIT');
      return evento;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async buscarPorId(eventoId) {
    const res = await pool.query(`SELECT * FROM eventos WHERE id = $1`, [eventoId]);
    return res.rows[0] || null;
  },

  async buscarPorCodigo(codigoConvite) {
    const res = await pool.query(
      `SELECT * FROM eventos WHERE UPPER(codigo_convite) = UPPER($1) AND ativo = true`,
      [codigoConvite.trim()]
    );
    return res.rows[0] || null;
  },

  async adicionarParticipante(eventoId, usuarioId) {
    const res = await pool.query(
      `INSERT INTO evento_participantes (evento_id, usuario_id)
       VALUES ($1, $2)
       ON CONFLICT (evento_id, usuario_id) DO UPDATE SET evento_id = EXCLUDED.evento_id
       RETURNING *`,
      [eventoId, usuarioId]
    );
    return res.rows[0];
  },

  async removerParticipante(eventoId, usuarioId) {
    const res = await pool.query(
      `DELETE FROM evento_participantes
       WHERE evento_id = $1 AND usuario_id = $2
       RETURNING *`,
      [eventoId, usuarioId]
    );
    return res.rows[0] || null;
  },

  async excluir(eventoId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`DELETE FROM visitas WHERE evento_id = $1`, [eventoId]);
      await client.query(`DELETE FROM evento_participantes WHERE evento_id = $1`, [eventoId]);
      await client.query(`DELETE FROM salas WHERE evento_id = $1`, [eventoId]);

      const res = await client.query(
        `DELETE FROM eventos WHERE id = $1 RETURNING *`,
        [eventoId]
      );

      await client.query('COMMIT');
      return res.rows[0] || null;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async listarPorUsuario(usuarioId) {
    const res = await pool.query(
      `SELECT e.*, ep.pontos_evento, ep.entrou_em,
              (e.criador_id = $1) AS sou_criador
       FROM eventos e
       INNER JOIN evento_participantes ep ON ep.evento_id = e.id
       WHERE ep.usuario_id = $1 AND e.ativo = true
       ORDER BY ep.entrou_em DESC`,
      [usuarioId]
    );
    return res.rows;
  },

  async verificarParticipacao(eventoId, usuarioId) {
    const res = await pool.query(
      `SELECT * FROM evento_participantes WHERE evento_id = $1 AND usuario_id = $2`,
      [eventoId, usuarioId]
    );
    return res.rows[0] || null;
  },

  async criarSalaNoEvento({
    eventoId,
    nome,
    descricao,
    icone,
    ordem,
    pontos,
    qrToken,
    modoPalestra = false,
    questao = null,
  }) {
    const questaoJson =
      modoPalestra && questao && typeof questao === 'object'
        ? JSON.stringify({
            pergunta: String(questao.pergunta || '').trim(),
            alternativas: {
              A: String(questao.alternativas?.A || '').trim(),
              B: String(questao.alternativas?.B || '').trim(),
              C: String(questao.alternativas?.C || '').trim(),
              D: String(questao.alternativas?.D || '').trim(),
              E: String(questao.alternativas?.E || '').trim(),
            },
            correta: String(questao.correta || '').trim(),
          })
        : null;

    const res = await pool.query(
      `INSERT INTO salas (
         evento_id,
         sala,
         descricao,
         icone,
         pontos,
         ativa,
         qr_token,
         modo_palestra,
         questao
       )
       VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8::jsonb)
       RETURNING
         sala_id AS "salaId",
         evento_id,
         sala,
         descricao,
         icone,
         pontos,
         ativa,
         qr_token,
         bloquear_leitura,
         bloqueada_ate,
         modo_palestra AS "modoPalestra",
         questao`,
      [
        eventoId,
        String(nome).trim(),
        descricao ? String(descricao).trim() : null,
        String(icone || 'map-pin').trim(),
        Number(pontos) || 10,
        qrToken,
        Boolean(modoPalestra),
        questaoJson,
      ]
    );
    return res.rows[0];
  },

  async listarSalasDoEvento(eventoId) {
    const res = await pool.query(
      `SELECT
         sala_id AS "salaId",
         evento_id,
         sala,
         descricao,
         icone,
         pontos,
         ativa,
         qr_token,
         bloquear_leitura,
         bloqueada_ate,
         modo_palestra AS "modoPalestra",
         questao
       FROM salas
       WHERE evento_id = $1
       ORDER BY sala_id ASC`,
      [eventoId]
    );
    return res.rows;
  },

  async removerSalaDoEvento(eventoId, salaId) {
    const res = await pool.query(
      `DELETE FROM salas
       WHERE evento_id = $1 AND sala_id = $2
       RETURNING sala_id AS "salaId", sala`,
      [eventoId, salaId]
    );
    return res.rows[0] || null;
  },

  async buscarSalaPorToken(qrToken) {
    const res = await pool.query(
      `SELECT
         s.sala_id AS "salaId",
         s.evento_id,
         s.sala,
         s.descricao,
         s.icone,
         s.pontos,
         s.ativa,
         s.qr_token,
         s.bloquear_leitura,
         s.bloqueada_ate,
         s.modo_palestra AS "modoPalestra",
         s.questao,
         e.ativo AS evento_ativo
       FROM salas s
       INNER JOIN eventos e ON e.id = s.evento_id
       WHERE s.qr_token = $1`,
      [qrToken]
    );
    return res.rows[0] || null;
  },

  async registrarVisitaSala({ eventoId, salaId, usuarioId, pontos }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const visitaExistente = await client.query(
        `SELECT id FROM visitas
         WHERE evento_id = $1 AND sala_id = $2 AND usuario_id = $3`,
        [eventoId, salaId, usuarioId]
      );

      if (visitaExistente.rows.length > 0) {
        await client.query('ROLLBACK');
        return { jaConcluida: true };
      }

      await client.query(
        `INSERT INTO visitas (evento_id, sala_id, usuario_id)
         VALUES ($1, $2, $3)`,
        [eventoId, salaId, usuarioId]
      );

      const pontosRes = await client.query(
        `UPDATE evento_participantes
         SET pontos_evento = COALESCE(pontos_evento, 0) + $3
         WHERE evento_id = $1 AND usuario_id = $2
         RETURNING pontos_evento`,
        [eventoId, usuarioId, pontos || 0]
      );

      await client.query('COMMIT');
      return {
        jaConcluida: false,
        pontos_evento: pontosRes.rows[0]?.pontos_evento ?? 0,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async buscarDadosHome(eventoId, usuarioId) {
    const eventoRes = await pool.query(`SELECT * FROM eventos WHERE id = $1`, [eventoId]);
    const evento = eventoRes.rows[0];
    if (!evento) return null;

    const salasRes = await pool.query(
      `SELECT
         s.sala_id AS "salaId",
         s.evento_id,
         s.sala,
         s.descricao,
         s.icone,
         s.pontos,
         s.ativa,
         s.qr_token,
         s.bloquear_leitura,
         s.bloqueada_ate,
         s.modo_palestra AS "modoPalestra",
         CASE
           WHEN s.questao IS NOT NULL THEN s.questao - 'correta'
           ELSE NULL
         END AS questao,
         EXISTS (
           SELECT 1 FROM visitas v
           WHERE v.sala_id = s.sala_id
             AND v.usuario_id = $2
             AND v.evento_id = $1
         ) AS concluida
       FROM salas s
       WHERE s.evento_id = $1 AND s.ativa = true
       ORDER BY s.sala_id ASC`,
      [eventoId, usuarioId]
    );

    const salas = salasRes.rows;
    const total = salas.length;
    const concluidas = salas.filter((s) => s.concluida).length;

    return {
      evento,
      progresso: {
        concluidas,
        total,
        percentual: total > 0 ? Math.round((concluidas / total) * 100) : 0,
      },
      salas,
    };
  },
};

module.exports = EventoModel;