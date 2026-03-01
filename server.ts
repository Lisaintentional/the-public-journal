

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
app.get('/api/journal', async (req, res) => {
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