const db = require("../database/db")
const TAXA_CADASTRO_PADRAO = 0.7
const AMOSTRA_MINIMA = 20
const TAXA_PARTICIPACAO_PADRAO = 0.6   
const FRACAO_SALAS_PADRAO = 0.3        

async function obterResumo() {
    const r = await db.query(`
        WITH pares AS (
            -- pares únicos (usuário, sala ativa): visitas repetidas na mesma sala contam uma vez só
            SELECT COUNT(*)::NUMERIC AS total
            FROM (
                SELECT DISTINCT v.usuario_id, v.sala_id
                FROM visitas v
                JOIN usuarios u ON u.id = v.usuario_id
                JOIN salas s ON s.sala_id = v.sala_id
                WHERE s.ativa = true
            ) x
        )
        SELECT
            (SELECT COUNT(*) FROM visitas)::INTEGER AS "totalVisitas",
            (SELECT COUNT(*) FROM usuarios)::INTEGER AS "totalUsuarios",
            (SELECT COUNT(DISTINCT usuario_id) FROM visitas)::INTEGER AS "usuariosAtivos",
            (SELECT COUNT(*) FROM salas WHERE ativa = true)::INTEGER AS "salasAtivas",
            (
                SELECT COALESCE(ROUND(AVG(pts), 1), 0)::FLOAT
                FROM (
                    SELECT COALESCE(SUM(v.pontuacao), 0) AS pts
                    FROM usuarios u
                    LEFT JOIN visitas v ON v.usuario_id = u.id
                    GROUP BY u.id
                ) t
            ) AS "mediaPontos",
            -- média de salas ativas distintas visitadas por usuário (todos os usuários)
            COALESCE(
                ROUND(
                    (SELECT total FROM pares)
                    / NULLIF((SELECT COUNT(*) FROM usuarios), 0),
                1),
            0)::FLOAT AS "mediaSalasVisitadas",
            -- (média de salas visitadas / total de salas ativas) * 100
            COALESCE(
                ROUND(
                    (SELECT total FROM pares) * 100
                    / NULLIF(
                        (SELECT COUNT(*) FROM usuarios) * (SELECT COUNT(*) FROM salas WHERE ativa = true),
                    0),
                1),
            0)::FLOAT AS "taxaAproveitamentoMedia"
    `)
    return r.rows[0]
}

async function obterSalasPorVisitas() {
    const r = await db.query(`
        SELECT
            s.sala_id AS "salaId",
            s.sala,
            s.ativa,
            COUNT(v.id)::INTEGER AS visitas,
            COUNT(DISTINCT v.usuario_id)::INTEGER AS visitantes
        FROM salas s
        LEFT JOIN visitas v ON v.sala_id = s.sala_id
        GROUP BY s.sala_id, s.sala, s.ativa
        ORDER BY visitas DESC, s.sala ASC
    `)
    return r.rows
}

async function obterSalasNaoVisitadas() {
    const r = await db.query(`
        SELECT s.sala_id AS "salaId", s.sala, s.ativa
        FROM salas s
        WHERE s.ativa = true AND NOT EXISTS (
            SELECT 1 FROM visitas v WHERE v.sala_id = s.sala_id
        )
        ORDER BY s.sala ASC
    `)
    return r.rows
}

async function obterBaseProjecao() {
    const r = await db.query(`
        WITH por_usuario AS (
            -- por usuário: visitas, pontos e salas distintas (só salas ativas)
            SELECT
                u.id,
                COUNT(va.id) AS visitas,
                COALESCE(SUM(va.pontuacao), 0) AS pontos,
                COUNT(DISTINCT va.sala_id) AS salas
            FROM usuarios u
            LEFT JOIN (
                SELECT v.id, v.usuario_id, v.sala_id, v.pontuacao
                FROM visitas v
                JOIN salas s ON s.sala_id = v.sala_id
                WHERE s.ativa = true
            ) va ON va.usuario_id = u.id
            GROUP BY u.id
        ),
        limites AS (
            -- teto por usuário (percentil 95) entre quem participou: valores extremos não inflam a média
            SELECT
                COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY visitas::FLOAT), 0) AS p95_visitas,
                COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pontos::FLOAT), 0) AS p95_pontos
            FROM por_usuario
            WHERE visitas > 0
        )
        SELECT
            COUNT(*)::INTEGER AS "usuariosHistoricos",
            (COUNT(*) FILTER (WHERE pu.visitas > 0))::INTEGER AS "usuariosAtivos",
            COALESCE(SUM(pu.visitas), 0)::INTEGER AS "visitasHistoricas",
            COALESCE(SUM(LEAST(pu.visitas::FLOAT, l.p95_visitas)), 0)::FLOAT AS "visitasLimitadas",
            COALESCE(SUM(LEAST(pu.pontos::FLOAT, l.p95_pontos)), 0)::FLOAT AS "pontosLimitados",
            COALESCE(SUM(pu.salas), 0)::INTEGER AS "salasDistintasTotal",
            (SELECT COUNT(*) FROM salas WHERE ativa = true)::INTEGER AS "salasAtivas",
            -- usado no modo sem histórico: pontos que uma sala ativa vale, em média
            (SELECT COALESCE(AVG(pontos), 0) FROM salas WHERE ativa = true)::FLOAT AS "pontosMediaSalas"
        FROM por_usuario pu
        CROSS JOIN limites l
    `)
    return r.rows[0]
}

function arredondar(valor, casas = 1) {
    const fator = 10 ** casas
    return Math.round(valor * fator) / fator
}

function distribuirProporcional(total, pesos) {
    const somaPesos = pesos.reduce((acc, p) => acc + p, 0)
    if (somaPesos === 0 || total === 0) return pesos.map(() => 0)

    const brutos = pesos.map((p) => (p / somaPesos) * total)
    const partes = brutos.map(Math.floor)
    const restante = total - partes.reduce((acc, p) => acc + p, 0)

    const ordem = brutos
        .map((b, i) => ({ i, resto: b - Math.floor(b) }))
        .sort((a, b) => b.resto - a.resto)

    for (let k = 0; k < restante && k < ordem.length; k++) partes[ordem[k].i] += 1
    return partes
}

function montarMetricas({ cadastrados, ativos, totalVisitas, pontosPorAtivo, salasPorAtivo, salasAtivas, salasOrdenadas, pesos, semHistorico }) {
    const mediaPontos = cadastrados > 0 ? (ativos * pontosPorAtivo) / cadastrados : 0
    const mediaSalasVisitadas = cadastrados > 0 ? (ativos * salasPorAtivo) / cadastrados : 0
    const taxaAproveitamento = salasAtivas > 0
        ? Math.min((mediaSalasVisitadas / salasAtivas) * 100, 100)
        : 0

    const visitasPorSala = distribuirProporcional(totalVisitas, pesos)

    const salas = salasOrdenadas
        .map((s, i) => ({
            salaId: s.salaId,
            sala: s.sala,
            visitas: visitasPorSala[i],
            semHistorico: semHistorico[i]
        }))
        .sort((a, b) => b.visitas - a.visitas || a.sala.localeCompare(b.sala, "pt-BR"))

    const salasNaoVisitadas = salas
        .filter((s) => s.visitas === 0)
        .map(({ salaId, sala, semHistorico: sh }) => ({ salaId, sala, semHistorico: sh }))

    return {
        resumo: {
            totalVisitas,
            totalUsuarios: cadastrados,
            usuariosAtivos: ativos,
            salasAtivas,
            mediaPontos: arredondar(mediaPontos),
            mediaSalasVisitadas: arredondar(mediaSalasVisitadas),
            taxaAproveitamentoMedia: arredondar(taxaAproveitamento)
        },
        salas,
        salasNaoVisitadas
    }
}

function calcularProjecao(base, salas, participantes, informadas = {}) {
    const {
        usuariosHistoricos, usuariosAtivos, visitasHistoricas,
        visitasLimitadas, pontosLimitados, salasDistintasTotal, salasAtivas, pontosMediaSalas
    } = base

    const taxaCadastro = informadas.taxaCadastro ?? TAXA_CADASTRO_PADRAO
    const ativas = salas.filter((s) => s.ativa)
    const dadosBase = { usuariosHistoricos, usuariosAtivosHistoricos: usuariosAtivos, visitasHistoricas }

    if (usuariosAtivos >= AMOSTRA_MINIMA) {
        const taxaAtivacao = usuariosAtivos / usuariosHistoricos
        const visitasPorAtivo = visitasLimitadas / usuariosAtivos
        const pontosPorAtivo = pontosLimitados / usuariosAtivos
        const salasPorAtivo = Math.min(salasDistintasTotal / usuariosAtivos, visitasPorAtivo, salasAtivas)

        const cadastrados = Math.round(participantes * taxaCadastro)
        const ativos = Math.min(Math.round(cadastrados * taxaAtivacao), cadastrados)
        const totalVisitas = Math.round(ativos * visitasPorAtivo)

        return {
            modo: "historico",
            distribuicao: "historico",
            participantesEsperados: participantes,
            premissas: {
                taxaCadastro: arredondar(taxaCadastro, 3),
                taxaAtivacao: arredondar(taxaAtivacao, 2),
                visitasPorUsuarioAtivo: arredondar(visitasPorAtivo),
                salasDistintasPorUsuarioAtivo: arredondar(salasPorAtivo),
                pontosPorUsuarioAtivo: arredondar(pontosPorAtivo)
            },
            base: { ...dadosBase, confiavel: true, aviso: null },
            ...montarMetricas({
                cadastrados, ativos, totalVisitas, pontosPorAtivo, salasPorAtivo, salasAtivas,
                salasOrdenadas: ativas,
                pesos: ativas.map((s) => s.visitas),
                semHistorico: ativas.map((s) => s.visitas === 0)
            })
        }
    }

    if (salasAtivas === 0) return null

    const aviso = `Ainda não há histórico suficiente (${usuariosAtivos} usuários ativos; o mínimo é ${AMOSTRA_MINIMA}). `
        + "A projeção usa as premissas informadas por você, não dados reais."
    const baseSemHistorico = { ...dadosBase, confiavel: false, aviso }

    const { taxaParticipacao, salasPorParticipante } = informadas

    if (taxaParticipacao === undefined || salasPorParticipante === undefined) {
        return {
            modo: "premissas",
            premissasNecessarias: true,
            participantesEsperados: participantes,
            base: baseSemHistorico,
            sugestoes: {
                taxaCadastro: arredondar(taxaCadastro, 3),
                taxaParticipacao: TAXA_PARTICIPACAO_PADRAO,
                salasPorParticipante: Math.max(1, Math.round(salasAtivas * FRACAO_SALAS_PADRAO))
            },
            limites: { salasPorParticipante: { min: 1, max: salasAtivas } }
        }
    }

    const cadastrados = Math.round(participantes * taxaCadastro)
    const ativos = Math.min(Math.round(cadastrados * taxaParticipacao), cadastrados)
    const totalVisitas = Math.round(ativos * salasPorParticipante)
    const pontosPorAtivo = salasPorParticipante * pontosMediaSalas

    const salasOrdenadas = [...ativas].sort((a, b) => a.sala.localeCompare(b.sala, "pt-BR"))

    return {
        modo: "premissas",
        distribuicao: "igualitaria",
        participantesEsperados: participantes,
        premissas: {
            taxaCadastro: arredondar(taxaCadastro, 3),
            taxaParticipacao: arredondar(taxaParticipacao, 3),
            salasPorParticipante: arredondar(salasPorParticipante),
            pontosPorSala: arredondar(pontosMediaSalas)
        },
        base: baseSemHistorico,
        ...montarMetricas({
            cadastrados, ativos, totalVisitas, pontosPorAtivo,
            salasPorAtivo: salasPorParticipante,
            salasAtivas,
            salasOrdenadas,
            pesos: salasOrdenadas.map(() => 1),
            semHistorico: salasOrdenadas.map(() => false)
        })
    }
}

module.exports = { 
    obterResumo, 
    obterSalasPorVisitas, 
    obterSalasNaoVisitadas,
    obterBaseProjecao,
    calcularProjecao
}