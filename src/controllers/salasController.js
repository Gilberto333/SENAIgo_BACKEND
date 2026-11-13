const salasModel = require("../models/salasModel")
const visitasModel = require("../models/locaisVisitasModel")

async function listarSalas(req, res) {
  try {
    const salas = await salasModel.listarSalas()
    return res.json(salas)
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao listar salas ativas." })
  }
}

async function listarTodasSalas(req, res) {
  try {
    const salas = await salasModel.listarTodasSalas()
    return res.json(salas)
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao listar todas as salas." })
  }
}

async function cadastrarSala(req, res) {
  try {
    const sala = await salasModel.cadastrarSala(req.body)
    return res.status(201).json({ sucesso: "Sala cadastrada com sucesso!", sala })
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao cadastrar sala." })
  }
}

async function atualizarSala(req, res) {
  try {
    const sala = await salasModel.atualizarSala(Number(req.params.id), req.body)

    if (!sala) {
      return res.status(404).json({ erro: "Sala não encontrada." })
    }

    return res.json({ sucesso: "Sala atualizada com sucesso!", sala })
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao atualizar sala." })
  }
}

async function removerSala(req, res) {
  try {
    const salaId = Number(req.params.id)
    const sala = await salasModel.buscarSalaPorId(salaId)

    if (!sala) {
      return res.status(404).json({ erro: "Sala não encontrada." })
    }

    const visitas = await visitasModel.listarVisitas()

    if (visitas.some(v => v.salaId === salaId)) {
      return res.status(409).json({ erro: "Esta sala já possui visitas e não pode ser removida. Desative-a pela edição." })
    }

    await salasModel.removerSala(salaId)

    return res.json({ sucesso: "Sala removida com sucesso!", sala })
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao remover sala." })
  }
}

async function bloquear_leitura(req, res) {
  const salaID = Number(req.params.id)
  const sala = await salasModel.bloquear_leitura(salaID)


}

module.exports = {
  listarSalas,
  listarTodasSalas,
  cadastrarSala,
  atualizarSala,
  removerSala,
  bloquear_leitura
}