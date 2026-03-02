import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. THE SHARED STYLES (Cyber-Zen Aesthetic) ---
const UI_SHELL = (content: string, userEmail?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --bg: #05070a;
            --glass: rgba(17, 24, 39, 0.7);
            --border: rgba(255, 255, 255, 0.08);
            --accent: #22d3ee;
            --text-main: #f8fafc;
            --text-dim: #64748b;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            background-image: radial-gradient(circle at 50% -20%, #1e293b 0%, #05070a 100%);
            color: var(--text-main);
            margin: 0;
            display: flex;
            justify-content: center;
            min-height: 100vh;
        }
        .container { width: 100%; max-width: 480px; padding: 20px; box-sizing: border-box; }
        .vault-card {
            background: var(--glass);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; font-size: 0.75rem; letter-spacing: 0.1em; color: var(--text-dim); }
        .btn-primary { 
            width: 100%; padding: 16px; background: #fff; color: #000; border: none; 
            border-radius: 14px; font-weight: 700; cursor: pointer; transition: 0.2s;
        }
        .btn-primary:hover { transform: translateY(-2px); opacity: 0.9; }
        input, textarea, select {
            width: 100%; padding: 14px; background: rgba(0,0,0,0.2); border: 1px solid var(--border);
            border-radius: 12px; color: white; margin-bottom: 12px; box-sizing: border-box; outline: none;
        }
        .entry { 
            background: rgba(255,255,255,0.03); border: 1px solid var(--border); 
            padding: 20px; border-radius: 18px; margin-bottom: 16px; 
        }
        .ai-badge { color: var(--accent); font-size: 0.7rem; font-weight: 800; margin-bottom: 8px; display: block; }
        .persona-tag { font-size: 0.65rem; background: var(--accent); color: #000; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span>SECURE PROTOCOL v1.0</span>
            ${userEmail ? `<span>${userEmail} | <a href="/logout" style="color:#ef4444; text-decoration:none;">EXIT</a></span>` : ''}
        </div>
        ${content}
    </div>
</body>
</html>
`;

// --- 2. DASHBOARD ---
app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const unlocked = (req.query.unlocked as string) || '';

    if (!user) {
        return res.send(UI_SHELL(`
            <div style="text-align: center; padding-top: 40px;">
                <div style="background: linear-gradient(135deg, #06b6d4, #3b82f6); height: 200px; border-radius: 20px; margin-bottom: 40px; display: flex; align-items: center; justify-content: center;">
                   <h1 style="font-size: 2.5rem; margin:0;">The<br>Privacy<br>Vault</h1>
                </div>
                <p style="color: var(--text-dim); margin-bottom: 30px;">Your healing journey is yours alone. Verify identity to unlock your space.</p>
                <form action="/login" method="POST">
                    <input type="email" name="email" placeholder="Access Email" required>
                    <button class="btn-primary">Request Entry</button>
                </form>
            </div>
        `));
    }

    const { data: entries } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    
    const checkLock = (name: string) => (unlocked === 'lifetime' || unlocked === name) ? '' : 'disabled';

    const listItems = entries?.map((e: any) => `
        <div class="entry">
            <div style="font-size: 0.7rem; color: var(--text-dim); margin-bottom: 10px;">${new Date(e.created_at).toLocaleString()}</div>
            <div style="line-height: 1.6;">${e.text}</div>
            ${e.summary ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border);"><span class="ai-badge">AI INSIGHT</span>${e.summary}</div>` : ''}
        </div>`).join('') || '<p style="text-align:center; color:var(--text-dim);">Your vault is currently empty.</p>';

    res.send(UI_SHELL(`
        <div class="vault-card" style="border-color: #10b981; background: rgba(16, 185, 129, 0.05);">
            <h4 style="margin: 0 0 15px 0; color: #10b981;">Unlock Archetypes</h4>
            <div style="display:flex; gap: 8px;">
                <button onclick="buy('shadow')" style="background:none; border: 1px solid var(--border); color: white; padding: 8px 12px; border-radius: 8px; cursor:pointer; font-size:0.8rem;">🌑 Shadow ($14)</button>
                <button onclick="buy('lifetime')" style="background:#10b981; border:none; color: white; padding: 8px 12px; border-radius: 8px; cursor:pointer; font-size:0.8rem; font-weight:700;">🌟 All Access</button>
            </div>
        </div>

        <div class="vault-card">
            <form action="/add-entry" method="POST">
                <input type="hidden" name="unlockedStatus" value="${unlocked}">
                <textarea name="text" placeholder="What is surfacing today?" required style="height: 120px;"></textarea>
                <select name="persona">
                    <option value="stoic">🏛️ Stoic Philosopher (Free)</option>
                    <option value="tough-love" ${checkLock('tough-love')}>🥊 Tough Love ${checkLock('tough-love') ? '🔒' : ''}</option>
                    <option value="shadow" ${checkLock('shadow')}>🌑 Shadow Worker ${checkLock('shadow') ? '🔒' : ''}</option>
                </select>
                <button type="submit" class="btn-primary">Secure Entry</button>
            </form>
        </div>

        <div id="list">${listItems}</div>

        <script>
            async function buy(persona) {
                const res = await fetch('/create-checkout', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({personaType: persona}) 
                });
                const data = await res.json();
                if(data.url) window.location.href = data.url;
            }
        </script>
    `, user.email));
});

// --- 3. LOGIC ROUTES (Auth, Journal, Stripe) ---
app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://' + req.get('host') } });
    res.send(UI_SHELL(`<div style="text-align:center; padding-top:100px;"><h2>Check your email! ✉️</h2><p style="color:var(--text-dim);">A secure link has been dispatched.</p></div>`));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.post('/add-entry', async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { text, persona, unlockedStatus } = req.body;
    if (!session) return res.redirect('/');

    let aiSummary = "";
    let prompt = "Summarize this.";
    if (persona === 'stoic') prompt = "You are a Stoic Philosopher. Deep, calm summary.";
    if (persona === 'tough-love') prompt = "You are a Tough Love Coach. Be blunt and direct.";
    if (persona === 'shadow') prompt = "You are a Shadow Worker. Identify hidden subconscious patterns.";

    try {
        const aiRes = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }],
            model: "gpt-3.5-turbo",
        });
        aiSummary = aiRes.choices[0].message.content || "";
    } catch (err) { console.log("AI failed"); }

    await supabase.from('journal_entries').insert([{ text, summary: aiSummary, user_id: session.user.id }]);
    res.redirect(unlockedStatus ? '/?success=true&unlocked=' + unlockedStatus : '/');
});

app.post('/create-checkout', async (req, res) => {
    const { personaType } = req.body;
    const prices: any = { 'tough-love': 999, 'shadow': 1499, 'lifetime': 4999 };
    const amount = prices[personaType] || 4999;

    const session = await stripe.checkout.sessions.create({
        line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Unlock Archetype: ' + personaType }, unit_amount: amount }, quantity: 1 }],
        mode: 'payment',
        success_url: 'https://' + req.get('host') + '/?success=true&unlocked=' + personaType,
        cancel_url: 'https://' + req.get('host'),
    });
    res.json({ url: session.url });
});

app.listen(PORT, '0.0.0.0', () => console.log("Vault live on port " + PORT));