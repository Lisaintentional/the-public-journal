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
  const unlocked = (req.query.unlocked as string) || '';

  try {
    const { data: entries } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });

    const listItems = entries?.map((e: any) => `
        <div class="entry-card">
          <div style="color: #94a3b8; font-size: 0.75rem;">${new Date(e.created_at).toLocaleString()}</div>
          <div style="margin: 10px 0; color: #f8fafc; line-height: 1.6;">${e.text}</div>
          ${e.summary ? `<div class="ai-box"><strong>AI:</strong> ${e.summary}</div>` : ''}
        </div>`).join('') || '<p style="text-align: center; color: #64748b;">The vault is empty.</p>';

    const checkLock = (name: string) => {
        if (unlocked === 'lifetime') return '';
        return unlocked === name ? '' : 'disabled';
    };

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>The Public Journal</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
              body { font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; margin: 0; scroll-behavior: smooth; }
              .container { max-width: 600px; margin: 0 auto; padding-top: 20px; }
              .card { background: #1e293b; padding: 25px; border-radius: 15px; border: 1px solid #334155; margin-bottom: 30px; }
              textarea { width: 100%; height: 100px; padding: 12px; border-radius: 8px; background: #0f172a; color: white; border: 1px solid #334155; box-sizing: border-box; font-size: 1rem; }
              select { width: 100%; padding: 12px; border-radius: 8px; background: #0f172a; color: white; border: 1px solid #334155; margin: 15px 0; cursor: pointer; }
              .btn-primary { background: #3b82f6; color: white; border: none; padding: 14px; border-radius: 8px; width: 100%; cursor: pointer; font-weight: bold; font-size: 1rem; }
              .price-list { list-style: none; padding: 0; margin-bottom: 20px; font-size: 0.9rem; }
              .price-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #334155; }
              .buy-btn { background: #10b981; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold; }
              .entry-card { background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 15px; }
              .ai-box { background: #0f172a; padding: 12px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 10px; color: #38bdf8; font-style: italic; }
              .back-to-top { position: fixed; bottom: 20px; right: 20px; background: #3b82f6; color: white; border: none; padding: 10px 15px; border-radius: 50px; cursor: pointer; display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-weight: bold; }
              .nav-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
              .refresh-link { color: #94a3b8; text-decoration: none; font-size: 0.8rem; border: 1px solid #334155; padding: 5px 10px; border-radius: 5px; }
          </style>
      </head>
      <body>
          <div class="container" id="top">
              <div class="nav-bar">
                  <span style="font-weight: bold; color: #3b82f6;">THE VAULT</span>
                  <a href="/" class="refresh-link">🔄 Reset View</a>
              </div>

              <h1 style="text-align: center; margin: 0 0 40px 0;">The Public Journal</h1>
              
              <div class="card" style="border-color: #10b981; background: rgba(16, 185, 129, 0.05);">
                  <h4 style="margin: 0 0 15px 0; color: #10b981; display: flex; align-items: center;">
                    🛒 <span style="margin-left: 8px;">Marketplace</span>
                  </h4>
                  <div class="price-list">
                      <div class="price-item"><span>🥊 Tough Love</span> <button class="buy-btn" onclick="buy('tough-love')">$9.99</button></div>
                      <div class="price-item"><span>🧘 Zen Master</span> <button class="buy-btn" onclick="buy('zen')">$9.99</button></div>
                      <div class="price-item"><span>🔍 Socratic</span> <button class="buy-btn" onclick="buy('socratic')">$9.99</button></div>
                      <div class="price-item"><span>🌑 Shadow Worker</span> <button class="buy-btn" onclick="buy('shadow')">$14.99</button></div>
                      <div class="price-item"><span>🌲 The Offline</span> <button class="buy-btn" onclick="buy('offline')">$19.99</button></div>
                      <div class="price-item" style="border: none; font-weight: bold; padding-top: 15px;">
                        <span>🌟 LIFETIME ACCESS (ALL)</span> 
                        <button class="buy-btn" style="background:#3b82f6;" onclick="buy('lifetime')">$49.99</button>
                      </div>
                  </div>
              </div>

              <div class="card">
                  <form action="/add-entry" method="POST">
                      <input type="hidden" name="unlockedStatus" value="${unlocked}">
                      <textarea name="text" placeholder="Start typing your entry..." required></textarea>
                      <select name="persona">
                          <option value="stoic">🏛️ The Stoic (Free)</option>
                          <option value="tough-love" ${checkLock('tough-love')}>🥊 Tough Love ${checkLock('tough-love') ? '🔒' : ''}</option>
                          <option value="zen" ${checkLock('zen')}>🧘 Zen Master ${checkLock('zen') ? '🔒' : ''}</option>
                          <option value="socratic" ${checkLock('socratic')}>🔍 Socratic ${checkLock('socratic') ? '🔒' : ''}</option>
                          <option value="shadow" ${checkLock('shadow')}>🌑 Shadow Worker ${checkLock('shadow') ? '🔒' : ''}</option>
                          <option value="offline" ${checkLock('offline')}>🌲 The Offline ${checkLock('offline') ? '🔒' : ''}</option>
                      </select>
                      <button type="submit" class="btn-primary">Secure & Analyze</button>
                  </form>
              </div>

              <h3 style="margin: 40px 0 20px 0; color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Recent Entries</h3>
              <div id="list">${listItems}</div>
          </div>

          <button class="back-to-top" id="backToTop" onclick="scrollToTop()">↑ Top</button>

          <script>
              // Handle Scrolling for "Back to Top"
              window.onscroll = function() {
                  const btn = document.getElementById("backToTop");
                  if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                      btn.style.display = "block";
                  } else {
                      btn.style.display = "none";
                  }
              };

              function scrollToTop() {
                  window.scrollTo({top: 0, behavior: 'smooth'});
              }

              async function buy(persona) {
                  try {
                      const res = await fetch('/api/create-checkout-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ personaType: persona })
                      });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                  } catch (e) { 
                      alert("Payment connection failed. Please check your internet."); 
                  }
              }
          </script>
      </body>
      </html>
    `);
  } catch (e) { res.status(500).send("Error loading vault."); }
});

// ... Keep your app.post('/add-entry') and app.post('/api/create-checkout-session') the same as before ...

app.post('/add-entry', async (req: Request, res: Response) => {
  const { text, persona, unlockedStatus } = req.body;
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
  res.redirect(unlockedStatus ? '/?success=true&unlocked=' + unlockedStatus : '/');
});

app.post('/api/create-checkout-session', async (req: Request, res: Response) => {
  const { personaType } = req.body;
  const prices: any = {
    'tough-love': 999, 'zen': 999, 'socratic': 999, 'shadow': 1499, 'offline': 1999, 'lifetime': 4999
  };
  const amount = prices[personaType] || 4999;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: { 
            currency: 'usd', 
            product_data: { name: 'Unlock Persona: ' + personaType }, 
            unit_amount: amount 
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: req.headers.origin + '/?success=true&unlocked=' + personaType,
      cancel_url: req.headers.origin + '/?canceled=true',
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: "error" }); }
});

app.listen(PORT, () => console.log("Vault Live on " + PORT));