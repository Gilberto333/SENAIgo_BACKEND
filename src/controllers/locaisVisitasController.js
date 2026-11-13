const visitasModel = require("../models/locaisVisitasModel")
const salasModel = require("../models/salasModel")

async function registrarVisitas(req, res) {
    try {
        const { nome, id } = req.usuario || {}
        const { salaId } = req.body

        if (!nome || !id || !salaId) {
            return res.status(400).json({
                erro: "Dados incompletos para registrar a visita."
            })
        }

        const salaCadastrada = await salasModel.buscarSalaPorId(Number(salaId))

        if (!salaCadastrada || !salaCadastrada.ativa) {
            return res.status(404).json({
                erro: "Sala não encontrada ou desativada."
            })
        }

        console.log("req.usuario:", req.usuario)
        console.log("req.body:", req.body)
        console.log("salaCadastrada:", salaCadastrada)

        const localDeVisita = await visitasModel.salvarVisita(
            nome,
            id,
            salaCadastrada.salaId,
            salaCadastrada.sala,
            salaCadastrada.pontos
        )

        return res.status(201).json({
            sucesso: "Visita registrada com sucesso!",
            localDeVisita
        })

    } catch (erro) {

        console.error("ERRO:", erro)

        if (erro.code === "23505") {
            return res.status(409).json({
                erro: "Você já registrou visita nesta sala."
            })
        }

        return res.status(500).json({
            erro: erro.message
        })
    }
}

async function listarVisitas(req, res) {
    try {
        const todasVisitas = await visitasModel.listarVisitas()
        return res.json(todasVisitas)
    } catch (erro) {
        return res.status(500).json({
            erro: "Erro ao listar visitas."
        })
    }
}

async function avaliarVisita(req, res) {
    try {
        const usuarioId = req.usuario?.id
        const visitaId = Number(req.params.id)
        const { estrelas, comentario } = req.body

        if (!Number.isInteger(visitaId) || visitaId <= 0) {
            return res.status(400).json({ erro: "Id da visita inválido." })
        }

        if (typeof estrelas !== "number" || !Number.isInteger(estrelas) || estrelas < 1 || estrelas > 5) {
            return res.status(400).json({ erro: "A avaliação deve ser um número inteiro de 1 a 5." })
        }

        let comentarioFinal = null

        if (comentario !== undefined && comentario !== null) {
            if (typeof comentario !== "string") {
                return res.status(400).json({ erro: "O comentário deve ser um texto." })
            }

            comentarioFinal = comentario.trim() || null

            if (comentarioFinal && comentarioFinal.length > 500) {
                return res.status(400).json({ erro: "O comentário pode ter no máximo 500 caracteres." })
            }
        }

        const visita = await visitasModel.buscarVisitaDoUsuario(visitaId, usuarioId)

        if (!visita) {
            return res.status(404).json({ erro: "Visita não encontrada." })
        }

        if (visita.estrelas !== null) {
            return res.status(409).json({ erro: "Esta visita já foi avaliada." })
        }

        const avaliacao = await visitasModel.avaliarVisita(
            visitaId,
            usuarioId,
            estrelas,
            comentarioFinal
        )

        if (!avaliacao) {
            return res.status(409).json({ erro: "Esta visita já foi avaliada." })
        }

        return res.json({
            sucesso: "Avaliação registrada com sucesso!",
            avaliacao
        })

    } catch (erro) {
        console.error("ERRO:", erro)
        return res.status(500).json({ erro: "Erro ao registrar avaliação." })
    }
}

module.exports = {
    registrarVisitas,
    listarVisitas,
    avaliarVisita
}