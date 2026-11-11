const model = require("../models/dashboardModel")

function lerLimite(valor, padrao, max = 50) {
    const n = parseInt(valor, 10)
    if (Number.isNaN(n) || n < 1) return padrao
    return Math.min(n, max)
}

function erroServidor(res, erro, mensagem) {
    console.error(`[dashboard] ${mensagem}:`, erro)
    return res.status(500).json({ erro: mensagem })
}

async function obterDashboard(req, res) {
    try {
        const topLimite = lerLimite(req.query.topUsuarios, 5)
        const visitasLimite = lerLimite(req.query.ultimasVisitas, 8)

        const [resumo, salas, salasNaoVisitadas, topUsuarios, ultimasVisitas] = await Promise.all([
            model.obterResumo(),
            model.obterSalasPorVisitas(),
            model.obterSalasNaoVisitadas(),
            model.obterTopUsuarios(topLimite),
            model.obterUltimasVisitas(visitasLimite)
        ])

        return res.json({ resumo, salas, salasNaoVisitadas, topUsuarios, ultimasVisitas })
    } catch (erro) {
        return erroServidor(res, erro, "Não foi possível carregar o dashboard.")
    }
}

async function obterResumo(req, res) {
    try {
        return res.json(await model.obterResumo())
    } catch (erro) {
        return erroServidor(res, erro, "Não foi possível carregar o resumo.")
    }
}

async function listarSalasMaisVisitadas(req, res) {
    try {
        const salas = await model.obterSalasPorVisitas()
        return res.json(salas)
    } catch (erro) {
        return erroServidor(res, erro, "Não foi possível carregar as salas.")
    }
}

async function listarTopUsuarios(req, res) {
    try {
        const limite = lerLimite(req.query.limite, 5)
        return res.json(await model.obterTopUsuarios(limite))
    } catch (erro) {
        return erroServidor(res, erro, "Não foi possível carregar o ranking.")
    }
}

async function listarUltimasVisitas(req, res) {
    try {
        const limite = lerLimite(req.query.limite, 8)
        return res.json(await model.obterUltimasVisitas(limite))
    } catch (erro) {
        return erroServidor(res, erro, "Não foi possível carregar as últimas visitas.")
    }
}

module.exports = {
    obterDashboard,
    obterResumo,
    listarSalasMaisVisitadas,
    listarTopUsuarios,
    listarUltimasVisitas
}