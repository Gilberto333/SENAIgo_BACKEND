const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
  const authHeaders = req.headers["authorization"];

  if (!authHeaders) {
    return res.status(401).json({
      erro: "Token de autenticação não enviado.",
    });
  }

  const token = authHeaders.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      erro: "Token inválido.",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (erro) {
    if (erro.name === "TokenExpiredError") {
      return res.status(401).json({
        erro: "Token expirado. Faça login novamente.",
      });
    }

    return res.status(401).json({
      erro: "Token inválido.",
    });
  }
}

function autorizarAdmin(req, res, next) {
  if (!req.usuario || !req.usuario.admin) {
    return res.status(403).json({ erro: "Acesso restrito a administradores." });
  }

  next();
}

autenticar.autorizarAdmin = autorizarAdmin;
module.exports = autenticar;