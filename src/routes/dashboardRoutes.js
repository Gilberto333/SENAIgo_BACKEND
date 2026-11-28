const express = require("express")
const controller = require("../controllers/dashboardController")

const router = express.Router()

router.get("/", controller.obterDashboard)
router.get("/resumo", controller.obterResumo)
router.get("/salas", controller.listarSalasMaisVisitadas)
router.get("/projecao", controller.gerarProjecao)
router.get("/avaliacoes", controller.listarAvaliacoesSalas)

module.exports = router