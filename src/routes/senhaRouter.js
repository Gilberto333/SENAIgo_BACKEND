const express = require("express")
const router = express.Router()
const senhaController = require("../controllers/senhaController")

router.post("/esqueciSenha", senhaController.esqueciSenha)
router.post("/redefinirSenha", senhaController.redefinirSenha)

module.exports = router