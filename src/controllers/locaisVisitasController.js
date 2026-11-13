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

module.exports = {
    registrarVisitas,
    listarVisitas
}