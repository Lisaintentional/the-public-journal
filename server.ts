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

    const listItems = entries?.map((e: any) => {
      const aiSection = e.summary ? `<div class="ai-box"><strong>AI Persona:</strong> ${e.summary}</div>` : '';
      return `
        <div class="entry">
          <div style="color: #94a3b8; font-size: 0.75rem;">${new Date(e.created_at).toLocaleString()}</div>
          <div style="margin: 10px 0; line-height: 1.5;">${e.text}</div>
          ${aiSection}
        </div>`;
    }).join('') || '<p style="text-align: center; color: #64748b;">The vault is empty.</p>';

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
              .btn-stripe { background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 10px; width: 100%; border-radius: 8px; margin-bottom: 20px; cursor: pointer; }
              .entry { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 15px; }
              .ai-box { background: #0f172a; padding: 12px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 10px; color: #38bdf8; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1 style="text-align: center; margin-bottom: 5px;">Lifetime Access Vault</h1>
              <p style="text-align: center; color: #94a3b8; margin-bottom: 30px;">Secure Offline Reflections</p>
              
              <button class="btn-stripe" onclick="checkout()">💳 Manage Lifetime Subscription</button>

              <div class="card">
                  <form action="/add-entry" method="POST">
                      <textarea name="text" placeholder="What is on your mind?" required></textarea>
                      <select name="persona">
                          <option value="stoic">🏛️ The Stoic</option>
                          <option value="tough-love">🥊 Tough Love</option>
                          <option value="zen">🧘 Zen Master</option>
                          <option value="socratic">🔍 Socratic Inquirer</option>
                          <option value="shadow">🌑 Shadow Worker</option>
                          <option value="offline">🌲 The Offline</option>
                      </select>
                      <button type="submit" class="btn-primary">Secure Entry & Analyze</button>
                  </form>
              </div>
              <div id="list">${listItems}</div>
          </div>
          <script>
              async function checkout() {
                  const res = await fetch('/api/create-checkout-session', { method: 'POST' });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
              }
          </script>
      </body>
      </html>
    `);
  } catch (e) { res.status(500).send("Error loading vault."); }
});

app.post('/add-entry', async (req: Request, res: Response) => {
  const { text, persona } = req.body;
  let aiSummary = "";
  let prompt = "Summarize this.";
  if (persona === 'stoic') prompt = "You are a Stoic Philosopher. Summarize deeply.";
  if (persona === 'tough-love') prompt = "You are a Tough Love Coach. Be blunt.";
  if (persona === 'zen') prompt = "You are a Zen Master. Respond with a koan.";
  if (persona === 'socratic') prompt = "You are a Socratic Inquirer. Ask a question.";
  if (persona === 'shadow') prompt = "You are a Shadow Worker. Reveal hidden motives.";
  if (persona === 'offline') prompt = "You are The Offline Guide. Focus on being present.";

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
  } catch (err) { res.status(500).send("Stripe error"); }
});

app.listen(PORT, () => console.log("Vault Live on " + PORT));