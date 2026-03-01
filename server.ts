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

// --- DASHBOARD ROUTE ---
app.get('/', async (req: Request, res: Response) => {
  // 1. Check if user is logged in (Supabase looks for a session)
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return res.send(`
      <body style="font-family:sans-serif; background:#0f172a; color:white; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
        <div style="background:#1e293b; padding:40px; border-radius:15px; border:1px solid #334155; width:350px;">
          <h1 style="text-align:center;">The Public Journal</h1>
          <p style="text-align:center; color:#94a3b8;">Sign in to access your private vault.</p>
          <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Your email" required style="width:100%; padding:12px; margin-bottom:15px; border-radius:8px; background:#0f172a; color:white; border:1px solid #334155;">
            <button style="width:100%; padding:12px; background:#3b82f6; border:none; color:white; border-radius:8px; font-weight:bold; cursor:pointer;">Send Magic Link</button>
          </form>
        </div>
      </body>
    `);
  }

  // 2. Fetch User Data (Notes + Pro Status)
  const { data: entries } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  
  const isPro = profile?.is_pro || req.query.success === 'true';

  const listItems = entries?.map((e: any) => `
    <div style="background:#1e293b; padding:20px; border-radius:12px; border:1px solid #334155; margin-bottom:15px;">
      <div style="color:#94a3b8; font-size:0.75rem;">${new Date(e.created_at).toLocaleString()}</div>
      <div style="margin:10px 0; color:#f8fafc;">${e.text}</div>
      ${e.summary ? `<div style="background:#0f172a; padding:12px; border-radius:8px; border-left:4px solid #3b82f6; color:#38bdf8;"><strong>AI:</strong> ${e.summary}</div>` : ''}
    </div>`).join('') || '<p style="text-align:center; color:#64748b;">Your vault is empty.</p>';

  res.send(`
    <!DOCTYPE html>
    <html style="scroll-behavior:smooth;">
    <body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:20px; margin:0;">
      <div style="max-width:600px; margin:0 auto; padding-top:20px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:30px;">
            <small style="color:#94a3b8;">${user.email}</small>
            <a href="/logout" style="color:#ef4444; text-decoration:none; font-size:0.8rem;">Logout</a>
        </div>

        ${!isPro ? `
        <div style="background:rgba(16, 185, 129, 0.1); border:1px solid #10b981; padding:20px; border-radius:15px; margin-bottom:30px;">
            <h4 style="margin:0 0 10px 0; color:#10b981;">Unlock Pro Personas</h4>
            <button onclick="buy('lifetime')" style="width:100%; padding:10px; background:#10b981; border:none; color:white; border-radius:8px; cursor:pointer; font-weight:bold;">Get Lifetime Access ($49.99)</button>
        </div>` : '<div style="text-align:center; color:#10b981; margin-bottom:20px;">✨ Pro Member</div>'}

        <div style="background:#1e293b; padding:25px; border-radius:15px; border:1px solid #334155; margin-bottom:30px;">
            <form action="/add-entry" method="POST">
                <textarea name="text" placeholder="What's on your mind?" required style="width:100%; height:100px; padding:12px; border-radius:8px; background:#0f172a; color:white; border:1px solid #334155; box-sizing:border-box;"></textarea>
                <select name="persona" style="width:100%; padding:12px; border-radius:8px; background:#0f172a; color:white; border:1px solid #334155; margin:15px 0;">
                    <option value="stoic">🏛️ Stoic (Free)</option>
                    <option value="tough-love" ${!isPro ? 'disabled' : ''}>🥊 Tough Love ${!isPro ? '🔒' : ''}</option>
                    <option value="zen" ${!isPro ? 'disabled' : ''}>🧘 Zen ${!isPro ? '🔒' : ''}</option>
                    <option value="shadow" ${!isPro ? 'disabled' : ''}>🌑 Shadow ${!isPro ? '🔒' : ''}</option>
                </select>
                <button type="submit" style="width:100%; padding:14px; background:#3b82f6; border:none; color:white; border-radius:8px; cursor:pointer; font-weight:bold;">Secure Entry</button>
            </form>
        </div>
        <div id="list">${listItems}</div>
      </div>
      <script>
        async function buy(type) {
            const res = await fetch('/create-checkout', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({type}) 
            });
            const data = await res.json();
            if(data.url) window.location.href = data.url;
        }
      </script>
    </body>
    </html>
  `);
});

// --- ROUTES ---
app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://' + req.get('host') } });
    res.send("<body style='background:#0f172a; color:white; font-family:sans-serif; text-align:center; padding-top:100px;'><h2>Check your email! ✉️</h2><p>Click the link in your inbox to sign in.</p></body>");
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.post('/add-entry', async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { text, persona } = req.body;
    if (!session) return res.redirect('/');

    let prompt = "Summarize this.";
    if (persona === 'stoic') prompt = "You are a Stoic Philosopher. Deep summary.";
    if (persona === 'tough-love') prompt = "You are a Tough Love Coach. Be blunt.";
    
    const aiRes = await openai.chat.completions.create({
        messages: [{ role: "system", content: prompt }, { role: "user", content: text }],
        model: "gpt-3.5-turbo",
    });

    await supabase.from('journal_entries').insert([{ 
        text, 
        summary: aiRes.choices[0].message.content, 
        user_id: session.user.id 
    }]);
    res.redirect('/');
});

app.post('/create-checkout', async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Lifetime Access' }, unit_amount: 4999 }, quantity: 1 }],
        mode: 'payment',
        success_url: 'https://' + req.get('host') + '/?success=true',
        cancel_url: 'https://' + req.get('host'),
    });
    res.json({ url: session.url });
});

app.listen(PORT, () => console.log("Vault Live with Auth"));