const express = require("express")
const controller = require("../controllers/dashboardController")

const router = express.Router()

router.get("/", controller.obterDashboard)
router.get("/resumo", controller.obterResumo)
router.get("/salas", controller.listarSalasMaisVisitadas)
router.get("/usuarios/top", controller.listarTopUsuarios)
router.get("/visitas/ultimas", controller.listarUltimasVisitas)

module.exports = router
