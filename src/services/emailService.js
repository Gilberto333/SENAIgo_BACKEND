const nodemailer = require("nodemailer")

const transporter = process.env.EMAIL_HOST
    ? nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: Number(process.env.EMAIL_PORT) || 587,
          secure: Number(process.env.EMAIL_PORT) === 465,
          auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
          }
      })
    : null

async function enviarCodigoRedefinicao(destino, codigo, minutosValidade) {
    if (!transporter) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Serviço de e-mail não configurado.")
        }
        console.log(`[DEV] Código de redefinição para ${destino}: ${codigo}`)
        return
    }

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: destino,
        subject: "Código para redefinir sua senha",
        text:
            `Seu código para redefinir a senha é: ${codigo}\n\n` +
            `Ele vale por ${minutosValidade} minutos. ` +
            `Se você não pediu isso, ignore este e-mail.`
    })
}

async function enviarEmailConfirmacaoCadastro(destino, nome) {
    if (!transporter) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Serviço de e-mail não configurado.")
        }
        console.log(`[DEV] E-mail de confirmação de cadastro para ${destino}`)
        return
    }

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: destino,
        subject: "Cadastro realizado com sucesso",
        text:
            `Olá, ${nome}!\n\n` +
            `Seu cadastro foi realizado com sucesso. ` +
            `Agora você já pode entrar com o e-mail e a senha que cadastrou.\n\n` +
            `Se você não fez esse cadastro, ignore este e-mail.`
    })
}

module.exports = { enviarCodigoRedefinicao, enviarEmailConfirmacaoCadastro }