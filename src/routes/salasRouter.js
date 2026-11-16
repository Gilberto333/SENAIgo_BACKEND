const express = require("express");
const router = express.Router();
const salasController = require("../controllers/salasController");
const middlewareAutenticar = require("../middlewares/autenticar");
const middlewareAutorizarAdmin = require("../middlewares/autorizarAdmin");
const validarSchema = require("../middlewares/validarSchema");
const schema = require("../middlewares/schema");

function validarParamId(req, res, next) {
  if (!/^\d+$/.test(String(req.params.id || ""))) {
    return res.status(400).json({ erro: "Identificador da sala inválido." });
  }
  return next();
}

router.get("/salas", salasController.listarSalas);
router.get("/todasSalas", middlewareAutenticar, middlewareAutorizarAdmin, salasController.listarTodasSalas);

router.post(
  "/cadastrarSala",
  middlewareAutenticar,
  middlewareAutorizarAdmin,
  validarSchema(schema.sala),
  salasController.cadastrarSala
);

router.put(
  "/atualizarSala/:id",
  validarParamId,
  middlewareAutenticar,
  middlewareAutorizarAdmin,
  validarSchema(schema.sala),
  salasController.atualizarSala
);

router.delete(
  "/removerSala/:id",
  validarParamId,
  middlewareAutenticar,
  middlewareAutorizarAdmin,
  salasController.removerSala
);

router.patch(
  "/bloquearLeitura/:id",
  validarParamId,
  middlewareAutenticar,
  middlewareAutorizarAdmin,
  salasController.bloquear_leitura
);

router.post(
  "/responderQuiz/:id",
  validarParamId,
  middlewareAutenticar,
  salasController.responderQuizPalestra
);

module.exports = router;