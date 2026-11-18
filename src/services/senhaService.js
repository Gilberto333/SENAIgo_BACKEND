const bcrypt = require("bcryptjs")

const CUSTO = 10

const REGEX_HASH_BCRYPT = /^\$2[aby]\$\d{2}\$.{53}$/

async function gerarHash(senha) {
    return bcrypt.hash(senha, CUSTO)
}

async function compararSenha(senha, hash) {
    if (typeof senha !== "string" || typeof hash !== "string") {
        return false
    }

    return bcrypt.compare(senha, hash)
}

function ehHashBcrypt(valor) {
    return typeof valor === "string" && REGEX_HASH_BCRYPT.test(valor)
}

module.exports = { gerarHash, compararSenha, ehHashBcrypt }