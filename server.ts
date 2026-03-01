import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. INITIALIZATION
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. THE VAULT DASHBOARD
app.get('/', async (req: Request, res: Response) => {
  const isSuccess = req.query.success === 'true';
  const unlocked = req.query.unlocked as string || ''; // e.g. 'shadow', 'zen', or 'lifetime'

  try {
    const { data: entries } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });

    const listItems = entries?.map((e: any) => `
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 15px;">
          <div style="color: #94a3b8; font-size: 0.75rem;">${new Date(e.created_at).toLocaleString()}</div>
          <div style="margin: 10px 0; color: #f8fafc;">${e.text}</div>
          ${e.summary ? `<div style="background: #0f172a; padding: 12px; border-radius: 8px; border-left: 4px solid #3b82f6; color: #38bdf8; font-style: italic;"><strong>AI:</strong> ${e.summary}</div>` : ''}
        </div>`).join('') || '<p style="text-align: center; color: #64748b;">The vault is empty.</p>';

    // Helper to check if a specific persona is unlocked
    const checkLock = (name: string) => {
        if (unlocked === 'lifetime') return ''; // Everything open
        if (unlocked === name) return ''; // This specific one open
        return 'disabled';
    };

    res.send(`
     <script>
    async function buy(persona) {
        console.log("Attempting to buy:", persona);
        try {
            const res = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personaType: persona })
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Server didn't return a payment link. Check Render logs.");
            }
        } catch (err) {
            console.error("Fetch error:", err);
            alert("Connection to server failed.");
        }
    }
</script>

// 3. THE ADD ENTRY ROUTE
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
  
  // Maintain the unlocked status in the URL after posting
  const redirectUrl = unlockedStatus ? `/?success=true&unlocked=\${unlockedStatus}` : '/';
  res.redirect(redirectUrl);
});

// 4. THE MULTI-ITEM STRIPE ROUTE
app.post('/api/create-checkout-session', async (req: Request, res: Response) => {
  const { personaType } = req.body;

  const prices: any = {
    'tough-love': { name: 'Tough Love Persona', amount: 999 },
    'zen': { name: 'Zen Master Persona', amount: 999 },
    'socratic': { name: 'Socratic Inquirer Persona', amount: 999 },
    'shadow': { name: 'Shadow Worker Persona', amount: 1499 },
    'offline': { name: 'The Offline Persona', amount: 1999 },
    'lifetime': { name: 'Lifetime Access (All Personas)', amount: 4999 }
  };

  const selected = prices[personaType] || prices['lifetime'];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: selected.name },
          unit_amount: selected.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      // Fixed: Removed backslashes from template strings
      success_url: `${req.headers.origin}/?success=true&unlocked=${personaType}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Session Error:", err);
    res.status(500).json({ error: "Stripe error" });
  }
});
app.listen(PORT, () => console.log("Vault Live on " + PORT));