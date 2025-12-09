import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth.js';
import { matchesRouter } from './routes/matches.js';
import { predictionsRouter } from './routes/predictions.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { tournamentsRouter } from './routes/tournaments.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('World Cup Backend is running');
});

app.use('/auth', authRouter);
app.use('/matches', matchesRouter);
app.use('/predictions', predictionsRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/tournaments', tournamentsRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
