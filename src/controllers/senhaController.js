const crypto = require("crypto")
const senhaModel = require("../models/senhaModel")
const { enviarCodigoRedefinicao } = require("../services/emailService")

const MINUTOS_VALIDADE = 15
const MAX_TENTATIVAS = 5
const TAMANHO_MINIMO_SENHA = 6
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function gerarHash(codigo) {
    return crypto.createHash("sha256").update(codigo).digest("hex")
}

function normalizarEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : ""
}

async function esqueciSenha(req, res, next) {
    try {
        const { email: emailBruto } = req.body ?? {}
        const email = normalizarEmail(emailBruto)

        if (!email) {
            return res.status(400).json({ erro: "O e-mail é obrigatório." })
        }
        if (!REGEX_EMAIL.test(email)) {
            return res.status(400).json({ erro: "Formato de e-mail inválido." })
        }

        const usuario = await senhaModel.buscarUsuarioPorEmail(email)
        if (!usuario) {
            return res.status(404).json({
                erro: "Não existe nenhum usuário cadastrado com esse e-mail."
            })
        }

        const codigo = String(crypto.randomInt(100000, 1000000))

        await senhaModel.invalidarCodigosAnteriores(usuario.id)
        await senhaModel.criarCodigoRedefinicao(usuario.id, gerarHash(codigo), MINUTOS_VALIDADE)
        await enviarCodigoRedefinicao(usuario.email, codigo, MINUTOS_VALIDADE)

        return res.status(200).json({
            mensagem: "Enviamos um código de 6 dígitos para o seu e-mail."
        })
    } catch (erro) {
        next(erro)
    }
}

async function redefinirSenha(req, res, next) {
    try {
        const { email: emailBruto, codigo, novaSenha } = req.body ?? {}
        const email = normalizarEmail(emailBruto)

        if (!email || !codigo || !novaSenha) {
            return res.status(400).json({
                erro: "E-mail, código e nova senha são obrigatórios."
            })
        }
        if (!REGEX_EMAIL.test(email)) {
            return res.status(400).json({ erro: "Formato de e-mail inválido." })
        }
        if (!/^\d{6}$/.test(String(codigo))) {
            return res.status(400).json({ erro: "O código deve ter 6 dígitos." })
        }
        if (typeof novaSenha !== "string" || novaSenha.length < TAMANHO_MINIMO_SENHA) {
            return res.status(400).json({
                erro: `A nova senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`
            })
        }

        const usuario = await senhaModel.buscarUsuarioPorEmail(email)
        if (!usuario) {
            return res.status(404).json({
                erro: "Não existe nenhum usuário cadastrado com esse e-mail."
            })
        }

        const registro = await senhaModel.buscarCodigoValido(usuario.id, MAX_TENTATIVAS)
        if (!registro) {
            return res.status(400).json({
                erro: "Código expirado ou bloqueado. Solicite um novo código."
            })
        }

        if (gerarHash(String(codigo)) !== registro.codigo_hash) {
            await senhaModel.incrementarTentativas(registro.id)
            return res.status(400).json({ erro: "Código incorreto." })
        }

        const senhaParaSalvar = novaSenha

        await senhaModel.atualizarSenha(usuario.id, senhaParaSalvar)
        await senhaModel.marcarCodigoComoUsado(registro.id)

        return res.status(200).json({ mensagem: "Senha alterada com sucesso." })
    } catch (erro) {
        next(erro)
    }
}

module.exports = { esqueciSenha, redefinirSenha }