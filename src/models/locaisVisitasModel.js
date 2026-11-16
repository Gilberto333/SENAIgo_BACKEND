const db = require("../database/db")

async function salvarVisita(usuario, id, salaId, sala, pontos) {
    const resultado = await db.query(
        `
        INSERT INTO visitas (usuario_id, sala_id, pontuacao)
        SELECT $1, $2, $3
        FROM salas
        WHERE sala_id = $2
          AND ativa = TRUE
          AND bloquear_leitura = FALSE
          AND (bloqueada_ate IS NULL OR bloqueada_ate > NOW())
        RETURNING id AS "visitaId", criado_em
        `,
        [id, salaId, pontos]
    )

    if (!resultado.rows[0]) {
        const erro = new Error("Leitura bloqueada ou tempo expirado para esta sala.")
        erro.status = 403
        throw erro
    }

    return {
        visitaId: resultado.rows[0].visitaId,
        id,
        nome: usuario,
        salaId,
        sala,
        pontuacao: pontos,
        criadoEm: resultado.rows[0].criado_em
    }
}

async function listarVisitas() {

    const resultado = await db.query(`
        SELECT
            v.usuario_id AS id,
            u.nome,
            v.sala_id AS "salaId",
            s.sala,
            v.pontuacao,
            v.criado_em AS "criadoEm"
        FROM visitas v
        JOIN usuarios u
            ON u.id = v.usuario_id
        JOIN salas s
            ON s.sala_id = v.sala_id
        ORDER BY v.criado_em DESC
    `)

    return resultado.rows
}


async function verificarVisita(usuarioId, salaId) {

    const resultado = await db.query(
        `
        SELECT 1
        FROM visitas
        WHERE usuario_id = $1
        AND sala_id = $2
        LIMIT 1
        `,
        [usuarioId, salaId]
    )

    return resultado.rows.length > 0
}

async function buscarVisitaDoUsuario(visitaId, usuarioId) {

    const resultado = await db.query(
        `
        SELECT id, estrelas
        FROM visitas
        WHERE id = $1
        AND usuario_id = $2
        `,
        [visitaId, usuarioId]
    )

    return resultado.rows[0] || null
}

async function avaliarVisita(visitaId, usuarioId, estrelas, comentario) {

    const resultado = await db.query(
        `
        UPDATE visitas
        SET estrelas = $1,
            comentario = $2,
            avaliado_em = NOW()
        WHERE id = $3
        AND usuario_id = $4
        AND estrelas IS NULL
        RETURNING id, estrelas, comentario, avaliado_em AS "avaliadoEm"
        `,
        [estrelas, comentario, visitaId, usuarioId]
    )

    return resultado.rows[0] || null
}

module.exports = {
    salvarVisita,
    listarVisitas,
    verificarVisita,
    buscarVisitaDoUsuario,
    avaliarVisita
}