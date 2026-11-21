const express = require('express');
const router = express.Router();
const EventoController = require('../controllers/eventoController');
const autenticar = require('../middlewares/autenticar');

router.use(autenticar);

router.post('/', EventoController.criar);
router.post('/entrar', EventoController.entrar);
router.get('/meus', EventoController.meusEventos);
router.post('/:eventoId/sair', EventoController.sair);
router.delete('/:eventoId', EventoController.excluir);
router.get('/:eventoId/salas', EventoController.listarSalas);
router.post('/:eventoId/salas', EventoController.adicionarSala);
router.delete('/:eventoId/salas/:salaId', EventoController.removerSala);
router.post('/:eventoId/qrcode/escanear', EventoController.escanearQrCode);
router.get('/:eventoId/home', EventoController.home);

module.exports = router;