const db = require("../database/db")

async function obterResumo() {
    const r = await db.query(`
        SELECT
            (SELECT COUNT(*) FROM visitas)::INTEGER AS "totalVisitas",
            (SELECT COUNT(*) FROM usuarios)::INTEGER AS "totalUsuarios",
            (SELECT COUNT(DISTINCT usuario_id) FROM visitas)::INTEGER AS "usuariosAtivos",
            (SELECT COUNT(*) FROM salas WHERE ativa = true)::INTEGER AS "salasAtivas",
            (
                SELECT COALESCE(ROUND(AVG(pts), 1), 0)::FLOAT
                FROM (
                    SELECT COALESCE(SUM(v.pontuacao), 0) AS pts
                    FROM usuarios u
                    LEFT JOIN visitas v ON v.usuario_id = u.id
                    GROUP BY u.id
                ) t
            ) AS "mediaPontos"
    `)
    return r.rows[0]
}

async function obterSalasPorVisitas() {
    const r = await db.query(`
        SELECT
            s.sala_id AS "salaId",
            s.sala,
            s.ativa,
            COUNT(v.id)::INTEGER AS visitas,
            COUNT(DISTINCT v.usuario_id)::INTEGER AS visitantes
        FROM salas s
        LEFT JOIN visitas v ON v.sala_id = s.sala_id
        GROUP BY s.sala_id, s.sala, s.ativa
        ORDER BY visitas DESC, s.sala ASC
    `)
    return r.rows
}

async function obterSalasNaoVisitadas() {
    const r = await db.query(`
        SELECT s.sala_id AS "salaId", s.sala, s.ativa
        FROM salas s
        WHERE s.ativa = true AND NOT EXISTS (
            SELECT 1 FROM visitas v WHERE v.sala_id = s.sala_id
        )
        ORDER BY s.sala ASC
    `)
    return r.rows
}

async function obterTopUsuarios(limite = 5) {
    const r = await db.query(`
        SELECT u.nome,
               COALESCE(SUM(v.pontuacao), 0)::INTEGER AS pontos,
               COUNT(v.id)::INTEGER AS visitas
        FROM usuarios u
        LEFT JOIN visitas v ON v.usuario_id = u.id
        GROUP BY u.id, u.nome
        ORDER BY pontos DESC, u.nome ASC
        LIMIT $1
    `, [limite])
    return r.rows
}

async function obterUltimasVisitas(limite = 8) {
    const r = await db.query(`
        SELECT 
            u.nome, 
            s.sala, 
            v.pontuacao, 
            v.criado_em AS "criadoEm",
            EXTRACT(EPOCH FROM (NOW() - v.criado_em))::INTEGER AS "segundosAtras"
        FROM visitas v
        JOIN usuarios u ON u.id = v.usuario_id
        JOIN salas s ON s.sala_id = v.sala_id
        ORDER BY v.criado_em DESC
        LIMIT $1
    `, [limite])
    return r.rows
}

module.exports = { 
    obterResumo, 
    obterSalasPorVisitas, 
    obterSalasNaoVisitadas, 
    obterTopUsuarios, 
    obterUltimasVisitas 
}