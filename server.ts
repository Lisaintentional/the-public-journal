

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
app.use(express.static('dist')); // Serves your frontend if you built one

// --- JOURNAL API (Using Supabase instead of SQLite) ---
app.get(app.get('/', async (req, res) => {
  // Fetch real entries from Supabase to show on the home page
  const { data: entries } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });

  const listItems = entries?.map(e => `
    <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e1e4e8;">
      <div style="color: #666; font-size: 0.8rem; margin-bottom: 8px;">${new Date(e.created_at).toLocaleString()}</div>
      <div style="font-size: 1.1rem; color: #1a1a1a;">${e.text}</div>
      ${e.summary ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eee; color: #007bff; font-style: italic;">Summary: ${e.summary}</div>` : ''}
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
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px; color: #333; }
            .container { max-width: 700px; margin: 0 auto; }
            header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
            .card-form { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 40px; }
            textarea { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 15px; font-size: 1rem; min-height: 100px; margin-bottom: 15px; resize: vertical; box-sizing: border-box; }
            button { background: #1a1a1a; color: white; border: none; padding: 12px 25px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
            button:hover { background: #333; transform: translateY(-1px); }
            .unlock-btn { background: #007bff; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>Journal Vault</h1>
                <button class="unlock-btn" onclick="checkout()">Unlock Personas</button>
            </header>

            <div class="card-form">
                <form action="/api/journal" method="POST">
                    <textarea name="text" placeholder="What's happening offline?" required></textarea>
                    <button type="submit">Secure Entry</button>
                </form>
            </div>

            <div id="entries-list">
                ${listItems}
            </div>
        </div>

        <script>
            async function checkout() {
                const res = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ personaId: 'shadow', email: 'user@example.com' })
                });
                const { url } = await res.json();
                window.location.href = url;
            }
        </script>
    </body>
    </html>
  `);
});) => {
  const { data, error } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json(error);
  res.json(data);
});

app.post('/api/journal', async (req, res) => {
  const { text, summary } = req.body;
  const { data, error } = await supabase.from('journal_entries').insert([{ text, summary }]);
  if (error) return res.status(500).json(error);
  res.json({ success: true, data });
});

// --- STRIPE API (Your original logic) ---
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { personaId, email } = req.body;
    const origin = req.headers.origin || "http://localhost:3000";
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Unlock: ${personaId}` },
          unit_amount: 1999, // $19.99
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      success_url: `${origin}?success=true`,
      cancel_url: `${origin}?canceled=true`,
    });
    res.json({ url: session.url });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>The Public Journal is Live</h1>
        <p>If you see this, your server and Supabase are connected!</p>
        <a href="/api/journal">View API Data</a>
      </body>
    </html>
  `);
});
app.listen(PORT, () => {
  console.log(`ZEN MASTER: Full App Engine Live on Port ${PORT}`);
});