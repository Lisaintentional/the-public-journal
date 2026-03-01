import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req: Request, res: Response) => {
  try {
    const { data: entries } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });

    const listItems = entries?.map((e: any) => `
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 15px;">
          <div style="color: #94a3b8; font-size: 0.75rem;">${new Date(e.created_at).toLocaleString()}</div>
          <div style="margin: 10px 0; color: #f8fafc;">${e.text}</div>
          ${e.summary ? `<div style="background: #0f172a; padding: 12px; border-radius: 8px; border-left: 4px solid #3b82f6; color: #38bdf8;"><strong>AI:</strong> ${e.summary}</div>` : ''}
        </div>`).join('') || '<p style="text-align: center; color: #64748b;">The vault is empty.</p>';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Lifetime Access Vault</title>
          <style>
              body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; margin: 0; }
              .container { max-width: 600px; margin: 0 auto; padding-top: 40px; }
              .card { background: #1e293b; padding: 25px; border-radius: 15px; border: 1px solid #334155; margin-bottom: 30px; }
              textarea { width: 100%; height: 100px; padding: 12px; border-radius: 8px; background: #0f172a; color: white; border: 1px solid #334155; box-sizing: border-box; }
              select { width: 100%; padding: 12px; border-radius: 8px; background: #0f172a; color: white; border: 1px solid #334155; margin: 15px 0; }
              .btn-primary { background: #3b82f6; color: white; border: none; padding: 14px; border-radius: 8px; width: 100%; cursor: pointer; font-weight: bold; }
              .btn-stripe { background: #10b981; color: white; border: none; padding: 12px; width: 100%; border-radius: 8px; margin-bottom: 20px; cursor: pointer; font-weight: bold; }
              .btn-stripe:active { transform: scale(0.98); background: #059669; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1 style="text-align: center;">Lifetime Access Vault</h1>
              <button id="stripe-btn" class="btn-stripe">💳 Click to Unlock Lifetime Access</button>

              <div class="card">
                  <form action="/add-entry" method="POST">
                      <textarea name="text" placeholder="Journal entry..." required></textarea>
                      <select name="persona">
                          <option value="stoic">🏛️ Stoic</option>
                          <option value="tough-love">🥊 Tough Love</option>
                          <option value="zen">🧘 Zen</option>
                          <option value="socratic">🔍 Socratic</option>
                          <option value="shadow">🌑 Shadow</option>
                          <option value="offline">🌲 Offline</option>
                      </select>
                      <button type="submit" class="btn-primary">Secure Entry</button>
                  </form>
              </div>
              <div id="list">${listItems}</div>
          </div>
          <script>
              document.getElementById('stripe-btn').addEventListener('click', async () => {
                  const btn = document.getElementById('stripe-btn');
                  btn.innerText = "Connecting to Stripe...";
                  try {
                      const res = await fetch('/api/create-checkout-session', { method: 'POST' });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                  } catch (e) {
                      alert("Stripe connection failed.");
                      btn.innerText = "💳 Click to Unlock Lifetime Access";
                  }
              });
          </script>
      </body>
      </html>
    `);
  } catch (e) { res.status(500).send("Error"); }
});

app.post('/add-entry', async (req: Request, res: Response) => {
  const { text, persona } = req.body;
  let aiSummary = "";
  let prompt = "Summarize this.";
  if (persona === 'stoic') prompt = "You are a Stoic. Deep summary.";
  if (persona === 'tough-love') prompt = "You are Tough Love. Be blunt.";
  if (persona === 'zen') prompt = "You are Zen. Short koan.";
  if (persona === 'socratic') prompt = "You are Socratic. Ask a question.";
  if (persona === 'shadow') prompt = "You are a Shadow Worker. Reveal motives.";
  if (persona === 'offline') prompt = "You are Offline. Focus on now.";

  try {
    const aiRes = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }, { role: "user", content: text }],
      model: "gpt-3.5-turbo",
    });
    aiSummary = aiRes.choices[0].message.content || "";
  } catch (err) { console.log("AI failed"); }

  await supabase.from('journal_entries').insert([{ text, summary: aiSummary }]);
  res.redirect('/');
});

app.post('/api/create-checkout-session', async (req: Request, res: Response) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Lifetime Access' }, unit_amount: 9900 }, quantity: 1 }],
      mode: 'payment',
      success_url: req.headers.origin + '/?success=true',
      cancel_url: req.headers.origin + '/?canceled=true',
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: "Stripe error" }); }
});

app.listen(PORT, () => console.log("Live on " + PORT));