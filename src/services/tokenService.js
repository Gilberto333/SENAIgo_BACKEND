const jwt = require("jsonwebtoken")

function ehAdmin(email) {
    const admins = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)

    return admins.includes(String(email).toLowerCase())
}

function gerarToken(usuario) {
    const admin = ehAdmin(usuario.email)

    const token = jwt.sign(
        {
            id: usuario.id,
            nome: usuario.nome,
            admin
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "24h"
        }
    )

    return { token, admin }
}

module.exports = { gerarToken }