const model = require("../models/dashboardModel")

const MAX_PARTICIPANTES = 50000

function erroServidor(res, erro, mensagem) {
    console.error(`[dashboard] ${mensagem}:`, erro)
    return res.status(500).json({ erro: mensagem })
}

function lerParticipantes(valor) {
    if (!/^\d+$/.test(String(valor))) return null
    const n = parseInt(valor, 10)
    if (n < 1 || n > MAX_PARTICIPANTES) return null
    return n
}

function lerNumero(valor) {
    if (valor === undefined) return undefined
    if (!/^\d+(\.\d+)?$/.test(String(valor))) return null
    return Number(valor)
}

function lerTaxa(valor) {
    const n = lerNumero(valor)
    if (n === undefined || n === null) return n
    return n >= 0.01 && n <= 1 ? n : null
}

function lerSalasPorParticipante(valor) {
    const n = lerNumero(valor)
    if (n === undefined || n ===null) return n
    return n >= 1 ? n : null
}

async function obterDashboard(req, res) {
    try {
        const [resumo, salas, salasNaoVisitadas] = await Promise.all([
            model.obterResumo(),
            model.obterSalasPorVisitas(),
            model.obterSalasNaoVisitadas()
        ])

        return res.json({ resumo, salas, salasNaoVisitadas })
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

async function gerarProjecao(req, res) {
    const participantes = lerParticipantes(req.query.participantes)
    if (participantes === null) {
        return res.status(400).json({
            erro: `Informe a quantidade de participantes (número inteiro entre 1 e ${MAX_PARTICIPANTES.toLocaleString("pt-BR")}).`
        })
    }

    const taxaCadastro = lerTaxa(req.query.taxaCadastro)
    if (taxaCadastro === null) {
        return res.status(400).json({
            erro: "A taxa de cadastro deve estar entre 0,01 e 1 (1 = 100%)."
        })
    }

    const taxaParticipacao = lerTaxa(req.query.taxaParticipacao)
    if (taxaParticipacao === null) {
        return res.status(400).json({
            erro: "A taxa de participação deve estar entre 0,01 e 1 (1 = 100%)."
        })
    }

    const salasPorParticipante = lerSalasPorParticipante(req.query.salasPorParticipante)
    if (salasPorParticipante === null) {
        return res.status(400).json({
            erro: "Informe pelo menos 1 sala por participante."
        })
    }

    try {
        const [base, salas] = await Promise.all([
            model.obterBaseProjecao(),
            model.obterSalasPorVisitas()
        ])

        if (salasPorParticipante !== undefined && salasPorParticipante > base.salasAtivas) {
            return res.status(400).json({
                erro: `Informe no máximo ${base.salasAtivas} salas por participante (total de salas ativas).`
            })
        }

        const projecao = model.calcularProjecao(base, salas, participantes, {
            taxaCadastro,
            taxaParticipacao,
            salasPorParticipante
        })

        if (!projecao) {
            return res.status(422).json({
                erro: "Não há salas ativas para gerar uma projeção."
            })
        }

        return res.json(projecao)
    } catch (erro) {
        return erroServidor(res, erro, "Não foi possível gerar a projeção.")
    }
}

async function listarAvaliacoesSalas(req, res){
try{
    const avaliacoes = await model.avaliacoesSalas()
return res.status(200).json(avaliacoes)
} catch (error){
    console.error('Erro ao buscar avaliações das salas:', error)
    return res.status(500).json({erro: 'Não foi possível carregar as avaliações das salas.'})
}
}

module.exports = {
    obterDashboard,
    obterResumo,
    listarSalasMaisVisitadas,
    gerarProjecao,
    listarAvaliacoesSalas
}