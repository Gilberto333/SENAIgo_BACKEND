const usuariosModel = require("../models/usuariosModel")

async function cadastrarUsuario(req, res) {
    const dadosUsuario = req.body

    const usuario = await usuariosModel.cadastrarUsuario(dadosUsuario)

    const { senha: _senha, ...usuarioSemSenha } = usuario

    return res.status(201).json({
        sucesso: "Usuário cadastrado com sucesso!",
        usuario: usuarioSemSenha
    })
}

async function obterRanking(req, res) {
    try {
        const limite = req.query.limite || 10
        const ranking = await usuariosModel.obterRanking(limite)

        return res.status(200).json({
            sucesso: true,
            ranking
        })
    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar o ranking de usuários.",
            erro: erro.message
        })
    }
}


module.exports = {
    cadastrarUsuario,
    obterRanking
}