import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Initialize Clients
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. The Dashboard Route
app.get('/', async (req: Request, res: Response) => {
  try {
    const { data: entries } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });

    const listItems = entries?.map(e => `
      <div style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e1e4e8; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <div style="color: #888; font-size: 0.8rem; margin-bottom: 5px;">${new Date(e.created_at).toLocaleString()}</div>
        <div style="font-size: 1.1rem; color: #333;">${e.text}</div>
        ${e.summary ? `
          <div style="margin-top: 15px; padding: 10px; background: #f0f7ff; border-left: 4px solid #007bff; border-radius: 4px; font-style: italic; color: #0056b3;">
            <strong>AI Insight:</strong> ${e.summary}
          </div>
        ` : ''}
      </div>
    `).join('') || '<p style="text-align: center; color: #888;">Your vault is currently empty.</p>';

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
          <title>Journal Vault | AI Personas</title>
          <style>
              body { font-family: -apple-system, sans-serif; background: #f8f9fa; padding: 40px 20px; }
              .container { max-width: 600px; margin: 0 auto; }
              textarea { width: 100%; height: 100px; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 10px; box-sizing: border-box; }
              button { background: #1a1a1a; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; }
              .unlock { background: #007bff; margin-bottom: 20px; }
          </style>
      </head>
      <body>
          <div class="container">
              <button class="unlock" onclick="checkout()">Unlock New AI Personas</button>
              <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 30px;">
                  <form action="/add-entry" method="POST">
                      <textarea name="text" placeholder="Write something for the AI to analyze..." required></textarea>
                      <button type="submit">Secure Entry & Analyze</button>
                  </form>
             <form action="/add-entry" method="POST">
    <textarea name="text" placeholder="Write something..." required></textarea>
    
    <div style="margin-bottom: 15px;">
        <label style="font-weight: bold; display: block; margin-bottom: 5px;">Choose Your Persona:</label>
        <select name="persona" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
            <option value="stoic">Stoic Philosopher (Standard)</option>
            <option value="cyberpunk">Cyberpunk Rebel (Pro Only)</option>
            <option value="zen">Zen Master (Pro Only)</option>
        </select>
    </div>

    <button type="submit">Secure Entry & Analyze</button>
</form>
              }
          </script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// 3. The AI + Database Route
app.postapp.post('/add-entry', async (req: Request, res: Response) => {
  const { text, persona } = req.body; // Now we get the persona choice!
  let aiSummary = "";

  // Set the "Voice" based on the selection
  let systemPrompt = "You are a Stoic Philosopher. Summarize this in one deep sentence.";
  
  if (persona === 'cyberpunk') {
    systemPrompt = "You are a gritty Cyberpunk hacker. Summarize this using slang and high-tech cynicism.";
  } else if (persona === 'zen') {
    systemPrompt = "You are a Zen Master. Respond with a short, peaceful koan or reflection.";
  }

  if (text) {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        model: "gpt-3.5-turbo",
      });
      aiSummary = completion.choices[0].message.content || "";
    } catch (e) {
      console.log("AI failed");
    }
    await supabase.from('journal_entries').insert([{ text, summary: aiSummary }]);
  }
  res.redirect('/');
});

// 4. Stripe Route
app.post('/api/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Stoic Persona Unlock' }, unit_amount: 1999 }, quantity: 1 }],
    mode: 'payment',
    success_url: req.headers.origin + '/?success=true',
    cancel_url: req.headers.origin + '/?canceled=true',
  });
  res.json({ url: session.url });
});

app.listen(PORT, () => console.log('Server Live'));