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

module.exports = {
    cadastrarUsuario,
    login,
    buscarPorCPF,
    obterRanking
}