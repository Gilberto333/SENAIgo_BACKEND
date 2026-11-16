const visitasModel = require("../models/locaisVisitasModel")
const salasModel = require("../models/salasModel")

const ALTERNATIVAS_VALIDAS = ["A", "B", "C", "D", "E"]

async function registrarVisitas(req, res) {
    try {
        const { nome, id } = req.usuario || {}
        const { salaId, resposta } = req.body

        if (!nome || !id || !salaId) {
            return res.status(400).json({
                erro: "Dados incompletos para registrar a visita."
            })
        }

        const salaIdNum = Number(salaId)
        if (!Number.isInteger(salaIdNum) || salaIdNum <= 0) {
            return res.status(400).json({
                erro: "ID da sala inválido."
            })
        }

        const salaCadastrada = await salasModel.buscarSalaPorId(salaIdNum)

        if (!salaCadastrada || !salaCadastrada.ativa) {
            return res.status(404).json({
                erro: "Sala não encontrada ou desativada."
            })
        }

        // 1. Verifica se a leitura do QR Code foi bloqueada manualmente pelo admin
        if (salaCadastrada.bloquear_leitura) {
            return res.status(403).json({
                erro: "A leitura do QR Code desta sala está bloqueada no momento."
            })
        }

        // 2. Verifica se já passou da data/hora limite configurada
        if (salaCadastrada.bloqueada_ate && new Date() > new Date(salaCadastrada.bloqueada_ate)) {
            return res.status(403).json({
                erro: "O tempo limite para ler o QR Code desta sala já encerrou."
            })
        }

        // 3. Verifica a resposta se a sala estiver no Modo Palestra
        if (salaCadastrada.modoPalestra && salaCadastrada.questao) {
            if (!resposta || typeof resposta !== "string") {
                return res.status(400).json({
                    erro: "Esta sala está em Modo Palestra. Responda à questão para validar sua visita."
                })
            }

            const respostaNormalizada = resposta.trim().toUpperCase()

            if (!ALTERNATIVAS_VALIDAS.includes(respostaNormalizada)) {
                return res.status(400).json({
                    erro: "Alternativa inválida. Escolha entre A, B, C, D ou E."
                })
            }

            const gabarito = String(salaCadastrada.questao.correta || "").trim().toUpperCase()

            if (respostaNormalizada !== gabarito) {
                return res.status(400).json({
                    erro: "Resposta incorreta! Tente novamente."
                })
            }
        }

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

        if (erro.status === 403) {
            return res.status(403).json({
                erro: erro.message
            })
        }

        if (erro.code === "23505") {
            return res.status(409).json({
                erro: "Você já registrou visita nesta sala."
            })
        }

        return res.status(500).json({
            erro: "Erro ao registrar visita."
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