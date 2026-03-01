import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase & Stripe
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- HOME ROUTE (The Full Dashboard UI) ---
app.get('/', async (req: Request, res: Response) => {
  const { data: entries } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });

  const listItems = entries?.map(e => `
    <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e1e4e8;">
      <div style="color: #666; font-size: 0.8rem; margin-bottom: 8px;">${new Date(e.created_at).toLocaleString()}</div>
      <div style="font-size: 1.1rem; color: #1a1a1a;">${e.text}</div>
    </div>
  `).join('') || '<p style="text-align: center; color: #888;">No entries in your vault yet.</p>';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>The Public Journal | Private Vault</title>
        <style>
            body { font-family: sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #333; }
            .container { max-width: 700px; margin: 0 auto; }
            .card-form { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 40px; }
            textarea { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 15px; min-height: 100px; margin-bottom: 15px; box-sizing: border-box; }
            button { background: #1a1a1a; color: white; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Journal Vault</h1>
            <div class="card-form">
                <form action="/add-entry" method="POST">
                    <textarea name="text" placeholder="What's happening offline?" required></textarea>
                    <button type="submit">Secure Entry</button>
                </form>
            </div>
            <div id="entries-list">${listItems}</div>
        </div>
    </body>
    </html>
  `);
});

// --- API: ADD ENTRY ---
app.post('/add-entry', async (req: Request, res: Response) => {
  const { text } = req.body;
  if (text) {
    await supabase.from('journal_entries').insert([{ text }]);
  }
  res.redirect('/');
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`ZEN MASTER: Full App Engine Live on Port ${PORT}`);
});