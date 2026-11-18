const usuariosModel = require("../models/usuariosModel")
const { gerarToken } = require("../services/tokenService")
const { compararSenha } = require("../services/senhaService")

async function login(req, res) {
    const { email, senha } = req.body

    const usuarioLogin = await usuariosModel.buscarPorEmail(email)

    const senhaCorreta = usuarioLogin
        ? await compararSenha(senha, usuarioLogin.senha)
        : false

    if (!senhaCorreta) {
        return res.status(400).json({
            erro: "Este email e senha não existem. Verifique se já realizou o cadastro."
        })
    }

    const { token, admin } = gerarToken(usuarioLogin)

    const { senha: _senha, ...usuarioSemSenha } = usuarioLogin

    return res.status(200).json({
        sucesso: "Login efetuado com sucesso.",
        usuarioLogin: {
            ...usuarioSemSenha,
            admin
        },
        token
    })
}

module.exports = login