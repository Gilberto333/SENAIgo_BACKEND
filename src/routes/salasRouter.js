const express = require("express")
const router = express.Router()
const salasController = require("../controllers/salasController")
const middlewareAutenticar = require("../middlewares/autenticar")
const middlewareAutorizarAdmin = require("../middlewares/autorizarAdmin")
const validarSchema = require("../middlewares/validarSchema")
const schema = require("../middlewares/schema")

router.get("/salas", salasController.listarSalas)
router.get("/todasSalas", middlewareAutenticar, middlewareAutorizarAdmin, salasController.listarTodasSalas)

router.post("/cadastrarSala", middlewareAutenticar, middlewareAutorizarAdmin, validarSchema(schema.sala), salasController.cadastrarSala)
router.put("/atualizarSala/:id", middlewareAutenticar, middlewareAutorizarAdmin, validarSchema(schema.sala), salasController.atualizarSala)
router.delete("/removerSala/:id", middlewareAutenticar, middlewareAutorizarAdmin, salasController.removerSala)
module.exports = router