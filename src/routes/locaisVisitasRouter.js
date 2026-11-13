const express = require("express")
const router = express.Router()
const visitasController = require("../controllers/locaisVisitasController")
const middlewareAutenticar = require("../middlewares/autenticar")
const middlewareVerificarVisita = require("../middlewares/VerificarVisitas")
router.post("/registrarLocal", middlewareAutenticar,middlewareVerificarVisita ,visitasController.registrarVisitas)
router.patch("/visitas/:id/avaliacao", middlewareAutenticar, visitasController.avaliarVisita)
router.get("/locais", visitasController.listarVisitas)

module.exports = router
