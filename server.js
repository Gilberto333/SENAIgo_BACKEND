require('dotenv').config();

const express = require('express');
const cors = require('cors');
const server = express();
const PORTA = process.env.PORT || 3000;

require('./src/database/db');

const usuarioRoutes = require('./src/routes/usuariosRouter');
const logger = require('./src/middlewares/logger');
const validarContentType = require('./src/middlewares/validarContetType');
const authRotas = require('./src/routes/authRouter');
const senhaRotas = require('./src/routes/senhaRouter');
const visitasRoutes = require('./src/routes/locaisVisitasRouter');
const salasRoutes = require('./src/routes/salasRouter');
const produtosRoutes = require('./src/routes/produtosRouter');
const resgatesRoutes = require('./src/routes/resgatesRouter');
const saldoRoutes = require('./src/routes/saldoRouter');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const eventoRoutes = require('./src/routes/eventoRoutes');
const { rotaNaoEncontrada, tratarErros } = require('./src/middlewares/tratarErros');

const origensPermitidas = (
  process.env.CORS_ORIGIN || 'http://localhost:5173,http://192.168.0.7:5173'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

server.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem Origin (ex.: Postman, curl, apps nativos) e origens da lista
      if (!origin || origensPermitidas.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

server.use(express.json());
server.use(validarContentType);
server.use(logger);

server.use('/auth', authRotas);
server.use('/auth', senhaRotas);
server.use('/admin/usuarios', usuarioRoutes);
server.use('/usuarios', usuarioRoutes);
server.use('/api/dashboard', dashboardRoutes);
server.use('/eventos', eventoRoutes);

server.use(visitasRoutes);
server.use(salasRoutes);
server.use(produtosRoutes);
server.use(resgatesRoutes);
server.use(saldoRoutes);

server.use(usuarioRoutes);

server.use(rotaNaoEncontrada);
server.use(tratarErros);

server.listen(PORTA, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORTA} e na rede local`);
  console.log('Origens CORS liberadas:', origensPermitidas);
});