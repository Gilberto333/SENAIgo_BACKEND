const crypto = require('crypto');
const EventoModel = require('../models/eventoModel');

function gerarCodigoConvite() {
  return 'SENAI-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

function extrairTokenQr(valorLido) {
  if (!valorLido || typeof valorLido !== 'string') return '';
  const limpo = valorLido.trim();

  if (limpo.startsWith('{')) {
    try {
      const parsed = JSON.parse(limpo);
      return String(parsed.qr_token || parsed.qrToken || parsed.token || '').trim();
    } catch {
      return limpo;
    }
  }

  return limpo;
}

const EventoController = {
  async criar(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { titulo, descricao } = req.body;

      if (!titulo || !titulo.trim()) {
        return res.status(400).json({ erro: 'O título do evento é obrigatório.' });
      }

      const codigoConvite = gerarCodigoConvite();
      const evento = await EventoModel.criar({
        titulo: titulo.trim(),
        descricao,
        codigoConvite,
        criadorId: usuarioId,
      });

      return res.status(201).json(evento);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      return res.status(500).json({ erro: 'Erro interno ao criar evento.' });
    }
  },

  async entrar(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { codigo_convite } = req.body;

      if (!codigo_convite) {
        return res.status(400).json({ erro: 'Informe o código de convite.' });
      }

      const evento = await EventoModel.buscarPorCodigo(codigo_convite);
      if (!evento) {
        return res.status(404).json({ erro: 'Evento não encontrado ou inativo.' });
      }

      await EventoModel.adicionarParticipante(evento.id, usuarioId);
      return res.json({ mensagem: 'Você entrou no evento!', evento });
    } catch (error) {
      console.error('Erro ao entrar no evento:', error);
      return res.status(500).json({ erro: 'Erro interno ao entrar no evento.' });
    }
  },

  async sair(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { eventoId } = req.params;

      const participacao = await EventoModel.verificarParticipacao(eventoId, usuarioId);
      if (!participacao) {
        return res.status(404).json({ erro: 'Você não participa deste evento.' });
      }

      await EventoModel.removerParticipante(eventoId, usuarioId);
      return res.json({ mensagem: 'Você saiu do evento com sucesso.' });
    } catch (error) {
      console.error('Erro ao sair do evento:', error);
      return res.status(500).json({ erro: 'Erro interno ao sair do evento.' });
    }
  },

  async excluir(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { eventoId } = req.params;

      const evento = await EventoModel.buscarPorId(eventoId);
      if (!evento) {
        return res.status(404).json({ erro: 'Evento não encontrado.' });
      }

      const ehCriador = String(evento.criador_id) === String(usuarioId);
      const ehAdmin =
        req.usuario.admin === true ||
        req.usuario.role === 'admin' ||
        req.usuario.tipo === 'admin' ||
        req.usuario.is_admin === true;

      if (!ehAdmin || !ehCriador) {
        return res.status(403).json({
          erro: 'Apenas o administrador que criou este evento pode apagá-lo.',
        });
      }

      await EventoModel.excluir(eventoId);
      return res.json({ mensagem: 'Evento apagado com sucesso.' });
    } catch (error) {
      console.error('Erro ao apagar evento:', error);
      return res.status(500).json({ erro: 'Erro interno ao apagar evento.' });
    }
  },

  async meusEventos(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const eventos = await EventoModel.listarPorUsuario(usuarioId);
      return res.json(eventos);
    } catch (error) {
      console.error('Erro ao listar eventos:', error);
      return res.status(500).json({ erro: 'Erro interno ao buscar eventos.' });
    }
  },

  async listarSalas(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { eventoId } = req.params;

      const participacao = await EventoModel.verificarParticipacao(eventoId, usuarioId);
      if (!participacao) {
        return res.status(403).json({ erro: 'Você não participa deste evento.' });
      }

      const salas = await EventoModel.listarSalasDoEvento(eventoId);
      return res.json(salas);
    } catch (error) {
      console.error('Erro ao listar salas do evento:', error);
      return res.status(500).json({ erro: 'Erro interno ao buscar salas do evento.' });
    }
  },

  async adicionarSala(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { eventoId } = req.params;
      const { nome, sala, descricao, icone, ordem, pontos, modoPalestra, questao } = req.body;

      const tituloSala = (nome || sala || '').trim();
      if (!tituloSala) {
        return res.status(400).json({ erro: 'O nome da sala/área é obrigatório.' });
      }

      const evento = await EventoModel.buscarPorId(eventoId);
      if (!evento) {
        return res.status(404).json({ erro: 'Evento não encontrado.' });
      }

      const ehAdmin =
        req.usuario.admin === true ||
        req.usuario.role === 'admin' ||
        req.usuario.tipo === 'admin' ||
        req.usuario.is_admin === true;
      const ehCriador = String(evento.criador_id) === String(usuarioId);

      if (!ehAdmin && !ehCriador) {
        return res.status(403).json({ erro: 'Apenas o administrador do evento pode criar salas.' });
      }

      const qrToken = `EVT_${eventoId}_${crypto.randomBytes(6).toString('hex')}`;
      const novaSala = await EventoModel.criarSalaNoEvento({
        eventoId,
        nome: tituloSala,
        descricao,
        icone,
        ordem,
        pontos,
        qrToken,
        modoPalestra,
        questao,
      });

      return res.status(201).json({
        sucesso: 'Sala cadastrada com sucesso no evento!',
        sala: novaSala,
      });
    } catch (error) {
      console.error('Erro ao adicionar sala ao evento:', error);
      return res.status(500).json({ erro: 'Erro interno ao adicionar sala.' });
    }
  },

  async removerSala(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { eventoId, salaId } = req.params;

      const evento = await EventoModel.buscarPorId(eventoId);
      if (!evento) {
        return res.status(404).json({ erro: 'Evento não encontrado.' });
      }

      const ehAdmin =
        req.usuario.admin === true ||
        req.usuario.role === 'admin' ||
        req.usuario.tipo === 'admin' ||
        req.usuario.is_admin === true;
      const ehCriador = String(evento.criador_id) === String(usuarioId);

      if (!ehAdmin && !ehCriador) {
        return res.status(403).json({ erro: 'Apenas o administrador do evento pode remover salas.' });
      }

      const removida = await EventoModel.removerSalaDoEvento(eventoId, salaId);
      if (!removida) {
        return res.status(404).json({ erro: 'Sala não encontrada neste evento.' });
      }

      return res.json({ mensagem: 'Sala removida com sucesso.', sala: removida });
    } catch (error) {
      console.error('Erro ao remover sala do evento:', error);
      return res.status(500).json({ erro: 'Erro interno ao remover sala (verifique se já há visitas).' });
    }
  },

  async escanearQrCode(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { eventoId } = req.params;
      const bruto = req.body?.qr_token || req.body?.qrToken || req.body?.codigo || '';
      const tokenLido = extrairTokenQr(bruto);

      if (!tokenLido) {
        return res.status(400).json({ erro: 'QR Code inválido ou vazio.' });
      }

      const sala = await EventoModel.buscarSalaPorToken(tokenLido);
      if (!sala || !sala.evento_ativo || !sala.ativa) {
        return res.status(404).json({ erro: 'QR Code não encontrado ou área inativa.' });
      }

      if (eventoId && String(sala.evento_id) !== String(eventoId)) {
        return res.status(400).json({
          erro: 'Este QR Code pertence a outro evento. Troque para o evento correto.',
        });
      }

      const participacao = await EventoModel.verificarParticipacao(sala.evento_id, usuarioId);
      if (!participacao) {
        return res.status(403).json({ erro: 'Você não participa deste evento.' });
      }

      const resultado = await EventoModel.registrarVisitaSala({
        eventoId: sala.evento_id,
        salaId: sala.salaId,
        usuarioId,
        pontos: sala.pontos,
      });

      if (resultado.jaConcluida) {
        return res.status(409).json({
          erro: 'Você já escaneou o QR Code desta área neste evento.',
        });
      }

      return res.json({
        mensagem: `Área "${sala.sala}" concluída! +${sala.pontos} pts`,
        sala,
        pontos_evento: resultado.pontos_evento,
      });
    } catch (error) {
      console.error('Erro ao escanear QR Code:', error);
      return res.status(500).json({ erro: 'Erro interno ao validar QR Code.' });
    }
  },

  async home(req, res) {
    try {
      const usuarioId = req.usuario.id;
      const { eventoId } = req.params;

      const participacao = await EventoModel.verificarParticipacao(eventoId, usuarioId);
      if (!participacao) {
        return res.status(403).json({ erro: 'Você não participa deste evento.' });
      }

      const dados = await EventoModel.buscarDadosHome(eventoId, usuarioId);
      return res.json({
        ...dados,
        pontos_evento: participacao.pontos_evento,
      });
    } catch (error) {
      console.error('Erro ao carregar Home do evento:', error);
      return res.status(500).json({ erro: 'Erro interno ao carregar trilha do evento.' });
    }
  },
};

module.exports = EventoController;