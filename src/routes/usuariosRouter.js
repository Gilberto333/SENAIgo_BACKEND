const express = require("express")
const router = express.Router()

const usuariosController = require("../controllers/usuariosController")
const validarSchema = require("../middlewares/validarSchema")
const schema = require("../middlewares/schema")
const validarCpf = require("../middlewares/validarCPF")
const verificarCadastro = require("../middlewares/verificarCadastroUsuario")

const autenticar = require("../middlewares/autenticar")
const autorizarAdmin = require("../middlewares/autorizarAdmin")

router.post(
    "/cadastrarUsuario",
    validarSchema(schema.cadastro),
    validarCpf,
    verificarCadastro,
    usuariosController.cadastrarUsuario
)

router.get("/ranking", usuariosController.obterRanking)

router.get(
    "/",
    autenticar,
    autorizarAdmin,
    usuariosController.listarUsuarios
)

router.get(
    "/:id",
    autenticar,
    autorizarAdmin,
    usuariosController.obterUsuarioPorId
)

router.get(
    "/:id/visitas",
    autenticar,
    autorizarAdmin,
    usuariosController.listarVisitasDoUsuario
)

module.exports = router