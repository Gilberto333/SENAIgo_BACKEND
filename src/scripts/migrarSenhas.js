

const db = require("../database/db")
const { gerarHash, ehHashBcrypt } = require("../services/senhaService")

async function migrarSenhas() {
    const cliente = await db.connect()

    try {
        await cliente.query("BEGIN")

        const { rows: usuarios } = await cliente.query("SELECT id, senha FROM usuarios")
        const pendentes = usuarios.filter((usuario) => !ehHashBcrypt(usuario.senha))

        console.log(`${pendentes.length} de ${usuarios.length} usuários precisam ser convertidos.`)

        for (const usuario of pendentes) {
            const hash = await gerarHash(usuario.senha)
            await cliente.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [hash, usuario.id])
        }

        const { rows: depois } = await cliente.query("SELECT id, senha FROM usuarios")
        const restantes = depois.filter((usuario) => !ehHashBcrypt(usuario.senha)).length

        if (restantes > 0) {
            throw new Error(`${restantes} usuários continuam com senha fora do formato bcrypt.`)
        }

        await cliente.query("COMMIT")
        console.log("✅ Migração concluída. Todas as senhas estão em hash bcrypt.")
    } catch (erro) {
        await cliente.query("ROLLBACK")
        console.error("❌ Migração cancelada (nada foi alterado):", erro.message)
        process.exitCode = 1
    } finally {
        cliente.release()
    }
}

migrarSenhas().finally(() => process.exit())