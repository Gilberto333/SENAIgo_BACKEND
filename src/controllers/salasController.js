const salasModel = require("../models/salasModel");
const visitasModel = require("../models/locaisVisitasModel");

const ALTERNATIVAS_VALIDAS = ["A", "B", "C", "D", "E"];
const TAMANHO_MAX_PERGUNTA = 500;
const TAMANHO_MAX_ALTERNATIVA = 250;

// Garante que o ID vindo da URL seja um inteiro positivo válido (evita NaN/overflow no PostgreSQL)
function parseIdPositivo(valor) {
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    return null;
  }
  return id;
}

function validarQuestaoPalestra(body) {
  if (!body || typeof body !== "object") {
    return "Corpo da requisição inválido.";
  }

  if (typeof body.modoPalestra !== "undefined" && typeof body.modoPalestra !== "boolean") {
    return "O campo modoPalestra deve ser booleano.";
  }

  if (!body.modoPalestra) return null;

  const { questao } = body;
  if (!questao || typeof questao !== "object" || Array.isArray(questao)) {
    return "Objeto de questão inválido.";
  }

  if (typeof questao.pergunta !== "string" || !questao.pergunta.trim()) {
    return "O enunciado da questão é obrigatório no Modo Palestra.";
  }

  if (questao.pergunta.trim().length > TAMANHO_MAX_PERGUNTA) {
    return `O enunciado não pode ultrapassar ${TAMANHO_MAX_PERGUNTA} caracteres.`;
  }

  if (!questao.alternativas || typeof questao.alternativas !== "object" || Array.isArray(questao.alternativas)) {
    return "As alternativas da questão são obrigatórias.";
  }

  for (const letra of ALTERNATIVAS_VALIDAS) {
    const textoAlt = questao.alternativas[letra];
    if (typeof textoAlt !== "string" || !textoAlt.trim()) {
      return `A alternativa ${letra} deve ser preenchida.`;
    }
    if (textoAlt.trim().length > TAMANHO_MAX_ALTERNATIVA) {
      return `A alternativa ${letra} não pode ultrapassar ${TAMANHO_MAX_ALTERNATIVA} caracteres.`;
    }
  }

  if (typeof questao.correta !== "string" || !ALTERNATIVAS_VALIDAS.includes(questao.correta)) {
    return "Selecione uma alternativa correta válida (A a E).";
  }

  return null;
}

async function listarSalas(req, res) {
  try {
    const salas = await salasModel.listarSalas();
    return res.json(salas);
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao listar salas ativas." });
  }
}

async function listarTodasSalas(req, res) {
  try {
    const salas = await salasModel.listarTodasSalas();
    return res.json(salas);
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao listar todas as salas." });
  }
}

async function cadastrarSala(req, res) {
  try {
    const erroQuestao = validarQuestaoPalestra(req.body);
    if (erroQuestao) {
      return res.status(400).json({ erro: erroQuestao });
    }

    const sala = await salasModel.cadastrarSala(req.body);
    return res.status(201).json({ sucesso: "Sala cadastrada com sucesso!", sala });
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao cadastrar sala." });
  }
}

async function atualizarSala(req, res) {
  try {
    const salaId = parseIdPositivo(req.params.id);
    if (!salaId) {
      return res.status(400).json({ erro: "ID da sala inválido." });
    }

    const erroQuestao = validarQuestaoPalestra(req.body);
    if (erroQuestao) {
      return res.status(400).json({ erro: erroQuestao });
    }

    const sala = await salasModel.atualizarSala(salaId, req.body);

    if (!sala) {
      return res.status(404).json({ erro: "Sala não encontrada." });
    }

    return res.json({ sucesso: "Sala atualizada com sucesso!", sala });
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao atualizar sala." });
  }
}

async function removerSala(req, res) {
  try {
    const salaId = parseIdPositivo(req.params.id);
    if (!salaId) {
      return res.status(400).json({ erro: "ID da sala inválido." });
    }

    const sala = await salasModel.buscarSalaPorId(salaId);

    if (!sala) {
      return res.status(404).json({ erro: "Sala não encontrada." });
    }

    const visitas = await visitasModel.listarVisitas();

    if (visitas.some((v) => v.salaId === salaId)) {
      return res
        .status(409)
        .json({ erro: "Esta sala já possui visitas e não pode ser removida. Desative-a pela edição." });
    }

    await salasModel.removerSala(salaId);

    return res.json({ sucesso: "Sala removida com sucesso!", sala });
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao remover sala." });
  }
}

async function bloquear_leitura(req, res) {
  try {
    const salaId = parseIdPositivo(req.params.id);
    if (!salaId) {
      return res.status(400).json({ erro: "ID da sala inválido." });
    }

    const { bloquear_leitura: bloquear, bloqueada_ate } = req.body || {};

    if (typeof bloquear !== "boolean") {
      return res.status(400).json({ erro: "O campo bloquear_leitura deve ser booleano." });
    }

    let dataBloqueio = null;
    if (bloqueada_ate !== null && bloqueada_ate !== undefined && bloqueada_ate !== "") {
      if (typeof bloqueada_ate !== "string") {
        return res.status(400).json({ erro: "Formato de data inválido." });
      }
      const dataParsed = new Date(bloqueada_ate);
      if (Number.isNaN(dataParsed.getTime())) {
        return res.status(400).json({ erro: "Data/hora de bloqueio inválida." });
      }
      dataBloqueio = dataParsed.toISOString();
    }

    const sala = await salasModel.bloquear_leitura(salaId, bloquear, dataBloqueio);

    if (!sala) {
      return res.status(404).json({ erro: "Sala não encontrada." });
    }

    return res.status(200).json({ sucesso: "Configuração de leitura atualizada com sucesso!", sala });
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao atualizar bloqueio de leitura da sala." });
  }
}

async function responderQuizPalestra(req, res) {
  try {
    const salaId = parseIdPositivo(req.params.id);
    if (!salaId) {
      return res.status(400).json({ erro: "ID da sala inválido." });
    }

    const { respostaEscolhida } = req.body || {};

    if (typeof respostaEscolhida !== "string" || !ALTERNATIVAS_VALIDAS.includes(respostaEscolhida)) {
      return res.status(400).json({ erro: "Alternativa inválida." });
    }

    const sala = await salasModel.buscarSalaPorId(salaId);

    if (!sala || !sala.ativa) {
      return res.status(404).json({ erro: "Sala não encontrada ou inativa." });
    }

    // Impede envio de resposta se a sala estiver bloqueada manualmente ou por horário
    const bloqueadaPorHorario = sala.bloqueada_ate && new Date(sala.bloqueada_ate) <= new Date();
    if (sala.bloquear_leitura || bloqueadaPorHorario) {
      return res.status(403).json({ erro: "A leitura desta sala está bloqueada no momento." });
    }

    if (!sala.modoPalestra || !sala.questao) {
      return res.status(400).json({ erro: "Esta sala não possui questão de palestra." });
    }

    const acertou = sala.questao.correta === respostaEscolhida;

    // Não envia "correta" quando o aluno erra para não vazar o gabarito na rede
    return res.status(200).json({
      acertou,
      ...(acertou ? { correta: sala.questao.correta } : {}),
      pontos: acertou ? sala.pontos : 0,
      sucesso: acertou ? `Resposta correta! +${sala.pontos} pontos.` : null,
      erro: !acertou ? "Resposta incorreta." : null,
    });
  } catch (error) {
    return res.status(500).json({ erro: "Erro ao validar resposta da palestra." });
  }
}

module.exports = {
  listarSalas,
  listarTodasSalas,
  cadastrarSala,
  atualizarSala,
  removerSala,
  bloquear_leitura,
  responderQuizPalestra,
};