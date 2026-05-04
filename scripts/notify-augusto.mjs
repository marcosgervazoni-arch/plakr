import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const userId = 3240001;
const title = 'Seus palpites estão salvos ✓';
const content = 'Tudo certo! Só falta o palpite de Portugal × Uzbequistão (23/06). Clique para apostar.';
const link = 'https://plakr.io/pool/wildbeer';

const [result] = await conn.execute(
  `INSERT INTO notifications (userId, type, title, message, isRead, actionUrl, actionLabel, priority, createdAt)
   VALUES (?, 'system', ?, ?, 0, ?, 'Fazer palpite', 'normal', NOW())`,
  [userId, title, content, link]
);

console.log('Notificação enviada! insertId:', result.insertId);
await conn.end();
