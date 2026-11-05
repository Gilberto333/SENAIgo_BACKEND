const express = require('express')
const router = express.Router()
const usuariosController = require('../controllers/usuariosController')
const validarSchema = require('../middlewares/validarSchema')
const schema = require('../middlewares/schema')
const validarCpf = require("../middlewares/validarCPF")
const verificarCadastro = require("../middlewares/verificarCadastroUsuario")

router.post("/cadastrarUsuario", validarSchema(schema.cadastro), validarCpf, verificarCadastro, usuariosController.cadastrarUsuario)
router.get("/ranking", usuariosController.obterRanking)

router.get("/", usuariosController.listarUsuarios)
router.get("/:id", usuariosController.obterUsuarioPorId)
router.get("/:id/visitas", usuariosController.listarVisitasDoUsuario)

module.exports = router