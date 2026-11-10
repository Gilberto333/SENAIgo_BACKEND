const pool = require("../database/db")

async function buscarUsuarioPorEmail(email) {
    const resultado = await pool.query(
        "SELECT id, email FROM usuarios WHERE LOWER(email) = $1 LIMIT 1",
        [email]
    )
    return resultado.rows[0] || null
}

async function invalidarCodigosAnteriores(usuarioId) {
    await pool.query(
        "UPDATE redefinicoes_senha SET usado = TRUE WHERE usuario_id = $1 AND usado = FALSE",
        [usuarioId]
    )
}

async function criarCodigoRedefinicao(usuarioId, codigoHash, minutosValidade) {
    await pool.query(
        `INSERT INTO redefinicoes_senha (usuario_id, codigo_hash, expira_em)
         VALUES ($1, $2, NOW() + make_interval(mins => $3))`,
        [usuarioId, codigoHash, minutosValidade]
    )
}

async function buscarCodigoValido(usuarioId, maxTentativas) {
    const resultado = await pool.query(
        `SELECT id, codigo_hash
           FROM redefinicoes_senha
          WHERE usuario_id = $1
            AND usado = FALSE
            AND expira_em > NOW()
            AND tentativas < $2
          ORDER BY criado_em DESC
          LIMIT 1`,
        [usuarioId, maxTentativas]
    )
    return resultado.rows[0] || null
}

async function incrementarTentativas(codigoId) {
    await pool.query(
        "UPDATE redefinicoes_senha SET tentativas = tentativas + 1 WHERE id = $1",
        [codigoId]
    )
}

async function marcarCodigoComoUsado(codigoId) {
    await pool.query(
        "UPDATE redefinicoes_senha SET usado = TRUE WHERE id = $1",
        [codigoId]
    )
}

async function atualizarSenha(usuarioId, novaSenha) {
    await pool.query(
        "UPDATE usuarios SET senha = $1 WHERE id = $2",
        [novaSenha, usuarioId]
    )
}

module.exports = {
    buscarUsuarioPorEmail,
    invalidarCodigosAnteriores,
    criarCodigoRedefinicao,
    buscarCodigoValido,
    incrementarTentativas,
    marcarCodigoComoUsado,
    atualizarSenha
}