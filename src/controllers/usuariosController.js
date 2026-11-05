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

async function listarUsuarios(req, res) {
    try {
        const usuarios = await usuariosModel.listarTodos()

        return res.status(200).json({
            sucesso: true,
            usuarios
        })
    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao listar usuários.",
            erro: erro.message
        })
    }
}

async function obterUsuarioPorId(req, res) {
    try {
        const { id } = req.params
        const usuario = await usuariosModel.buscarPorId(id)

        if (!usuario) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Usuário não encontrado."
            })
        }

        return res.status(200).json({
            sucesso: true,
            usuario
        })
    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao obter dados do usuário.",
            erro: erro.message
        })
    }
}

async function listarVisitasDoUsuario(req, res) {
    try {
        const { id } = req.params

        const usuarioExiste = await usuariosModel.buscarPorId(id)
        if (!usuarioExiste) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Usuário não encontrado."
            })
        }

        const visitas = await usuariosModel.obterVisitasPorUsuario(id)

        return res.status(200).json({
            sucesso: true,
            visitas
        })
    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao listar visitas do usuário.",
            erro: erro.message
        })
    }
}

module.exports = {
    cadastrarUsuario,
    obterRanking,
    listarUsuarios,
    obterUsuarioPorId,
    listarVisitasDoUsuario
}