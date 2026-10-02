import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './db.js';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database and seed initial data if needed
initDatabase();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for Vite dev server
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Root health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'Hostel Mess & Expense Splitter API', timestamp: new Date().toISOString() });
});

// Serve frontend build if dist folder exists in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Fallback for SPA routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.status(200).send('Hostel Mess API Server Running. Start Vite client on port 5173 for development.');
});

app.listen(PORT, () => {
  console.log(`🚀 Hostel Mess & Expense Splitter Server running at http://localhost:${PORT}`);
});
