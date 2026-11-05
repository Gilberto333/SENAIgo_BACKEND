const db = require("../database/db")

async function cadastrarUsuario(dadosUsuario) {
    const resultado = await db.query(
        `
        INSERT INTO usuarios (cpf, nome, email, senha)
        VALUES ($1, $2, $3, $4)
        RETURNING id, cpf, nome, email
        `,
        [
            dadosUsuario.cpf,
            dadosUsuario.nome,
            dadosUsuario.email,
            dadosUsuario.senha
        ]
    )

    return resultado.rows[0]
}

async function login(email, senha) {
    const resultado = await db.query(
        `
        SELECT
            id,
            cpf,
            nome,
            email,
            senha
        FROM usuarios
        WHERE email = $1
        AND senha = $2
        `,
        [email, senha]
    )

    return resultado.rows[0] || null
}

async function buscarPorCPF(cpf) {
    const resultado = await db.query(
        `
        SELECT
            id,
            cpf,
            nome,
            email
        FROM usuarios
        WHERE cpf = $1
        `,
        [cpf]
    )

    return resultado.rows[0] || null
}

async function obterRanking(limite = 10) {
    const resultado = await db.query(
        `
        SELECT
            u.nome,
            COALESCE(SUM(v.pontuacao), 0) AS pontos,
            ROW_NUMBER() OVER (
                ORDER BY COALESCE(SUM(v.pontuacao), 0) DESC, u.nome ASC
            ) AS posicao
        FROM usuarios u
        LEFT JOIN visitas v ON u.id = v.usuario_id
        GROUP BY u.id, u.nome
        ORDER BY pontos DESC, u.nome ASC
        LIMIT $1
        `,
        [limite]
    )

    return resultado.rows
}

async function listarTodos() {
    const resultado = await db.query(
        `
        SELECT
            id,
            cpf,
            nome,
            email
        FROM usuarios
        ORDER BY nome ASC
        `
    )

    return resultado.rows
}

async function buscarPorId(id) {
    const resultado = await db.query(
        `
        SELECT
            id,
            cpf,
            nome,
            email
        FROM usuarios
        WHERE id = $1
        `,
        [id]
    )

    return resultado.rows[0] || null
}

async function obterVisitasPorUsuario(usuarioId) {
    const resultado = await db.query(
        `
        SELECT 
            v.id AS visita_id,
            v.pontuacao,
            v.criado_em,
            v.criado_em AS data,
            v.criado_em AS data_visita,
            v.criado_em AS "criadoEm",
            s.sala_id,
            s.sala,
            s.sala AS nome,
            s.sala AS nome_sala,
            s.sala AS "nomeSala",
            s.pontos AS pontos_base_sala,
            s.icone,
            s.descricao,
            s.ativa
        FROM visitas v
        INNER JOIN salas s ON v.sala_id = s.sala_id
        WHERE v.usuario_id = $1
        ORDER BY v.criado_em DESC
        `,
        [usuarioId]
    )

    return resultado.rows
}

module.exports = {
    cadastrarUsuario,
    login,
    buscarPorCPF,
    obterRanking,
    listarTodos,
    buscarPorId,
    obterVisitasPorUsuario
}