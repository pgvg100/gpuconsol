import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API запущено: http://localhost:${port}`);
});
