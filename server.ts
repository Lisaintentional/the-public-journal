import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Using Number() ensures TypeScript treats the PORT correctly on Render
const PORT = Number(process.env.PORT) || 3000;

// Initialize API Clients
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 1. PROMPT LOGIC ---
const getDailyPrompt = () => {
    const prompts = [
        "What is a truth you are currently avoiding because it feels inconvenient?",
        "Which part of your personality do you try hardest to hide from strangers?",
        "What does 'safety' look like to you, and where in your life is it currently missing?",
        "Identify a recurring frustration. What is it trying to protect you from?",
        "If you could be 100% honest without consequences, what would you say right now?"
    ];
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return prompts[dayOfYear % prompts.length];
};

// --- 2. THE UI SHELL (Cyber-Zen Aesthetic) ---
const UI_SHELL = (content: string, userEmail?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        :root {
            --bg: #030508;
            --glass: rgba(15, 23, 42, 0.8);
            --border: rgba(34, 211, 238, 0.15);
            --accent: #22d3ee;
            --accent-glow: rgba(34, 211, 238, 0.3);
            --text-main: #ffffff;
            --text-dim: #94a3b8;
        }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
            background: var(--bg);
            background-image: 
                radial-gradient(circle at 50% 0%, #164e63 0%, transparent 50%),
                radial-gradient(circle at 0% 100%, #0c4a6e 0%, transparent 50%);
            background-attachment: fixed;
            color: var(--text-main);
            margin: 0;
            display: flex;
            justify-content: center;
            min-height: 100vh;
            line-height: 1.5;
        }
        .container { width: 100%; max-width: 440px; padding: 24px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; color: var(--text-dim); }
        .vault-card {
            background: var(--glass);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 28px;
            padding: 28px;
            margin-bottom: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }
        .btn-primary { 
            width: 100%; padding: 18px; background: #fff; color: #000; border: none; 
            border-radius: 16px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.3s;
        }
        .btn-primary:hover { transform: scale(1.02); }
        input, textarea, select {
            width: 100%; padding: 16px; background: rgba(0, 0, 0, 0.4); 
            border: 1px solid var(--border); border-radius: 16px; 
            color: #fff; margin-bottom: 16px; font-size: 1rem; outline: none;
        }
        .entry { background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); padding: 24px; border-radius: 22px; margin-bottom: 20px; }
        .ai-badge { color: var(--accent); font-size: 0.6rem; font-weight: 900; letter-spacing: 0.1em; margin-bottom: 12px; display: flex; align-items: center; }
        .ai-badge::before { content: ""; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; margin-right: 8px; box-shadow: 0 0 8px var(--accent); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span>NETWORK: SECURE</span>
            ${userEmail ? `<span><a href="/logout" style="color:#ef4444; text-decoration:none;">TERMINATE SESSION</a></span>` : '<span>ENCRYPTED_AUTH</span>'}
        </div>
        ${content}
    </div>
</body>
</html>
`;

// --- 3. DASHBOARD ---
app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const unlocked = (req.query.unlocked as string) || '';

    if (!user) {
        return res.send(UI_SHELL(`
            <div style="text-align: center; padding-top: 40px;">
                <div style="background: linear-gradient(135deg, #06b6d4, #3b82f6); height: 220px; border-radius: 32px; margin-bottom: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 30px var(--accent-glow);">
                   <span style="font-size: 0.6rem; font-weight: 900; letter-spacing: 0.3em; margin-bottom: 15px; opacity: 0.8;">ENCRYPTED ENVIRONMENT</span>
                   <h1 style="font-size: 2.8rem; margin:0; line-height: 1;">The<br>Privacy<br>Vault</h1>
                </div>
                <p style="color: var(--text-dim); margin-bottom: 30px; font-size: 1.1rem;">Your healing journey is yours alone. Enter your credentials to unlock your space.</p>
                <form action="/login" method="POST">
                    <input type="email" name="email" placeholder="Email Address" required>
                    <button class="btn-primary">Request Access</button>
                </form>
            </div>
        `));
    }

    const { data: entries } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const isUnlocked = (name: string) => (unlocked === 'lifetime' || unlocked === name);

    const listItems = entries?.map((e: any) => `
        <div class="entry">
            <div style="font-size: 0.7rem; color: var(--text-dim); margin-bottom: 12px;">${new Date(e.created_at).toLocaleString()}</div>
            <div style="line-height: 1.6; font-size: 1.05rem;">${e.text}</div>
            ${e.summary ? `<div style="margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border);"><span class="ai-badge">AI INSIGHT</span><span style="color: var(--text-dim); font-size: 0.95rem;">${e.summary}</span></div>` : ''}
        </div>`).join('') || '<p style="text-align:center; color:var(--text-dim);">The vault is currently empty.</p>';

    res.send(UI_SHELL(`
        <div class="vault-card" style="border-left: 4px solid var(--accent); background: rgba(34, 211, 238, 0.03);">
            <span class="ai-badge">DAILY SHADOW PROMPT</span>
            <p style="font-style: italic; font-size: 1.15rem; margin: 10px 0;">"${getDailyPrompt()}"</p>
        </div>

        <div class="vault-card" style="border-color: #10b981; background: rgba(16, 185, 129, 0.05);">
            <h4 style="margin: 0 0 15px 0; color: #10b981; font-size: 0.9rem; letter-spacing: 0.05em;">UNLOCK ARCHETYPES</h4>
            <div style="display:flex; gap: 10px;">
                <button onclick="buy('shadow')" style="background:none; border: 1px solid var(--border); color: white; padding: 10px 14px; border-radius: 12px; cursor:pointer; font-size:0.85rem;">🌑 Shadow ($14)</button>
                <button onclick="buy('lifetime')" style="background:#10b981; border:none; color: white; padding: 10px 14px; border-radius: 12px; cursor:pointer; font-size:0.85rem; font-weight:700;">🌟 All Access</button>
            </div>
        </div>

        <div class="vault-card">
            <form action="/add-entry" method="POST">
                <input type="hidden" name="unlockedStatus" value="${unlocked}">
                <textarea name="text" placeholder="Begin your reflection..." required style="height: 150px;"></textarea>
                <select name="persona">
                    <option value="stoic">🏛️ Stoic Philosopher (Free)</option>
                    <option value="tough-love" ${isUnlocked('tough-love') ? '' : 'disabled'}>🥊 Tough Love ${isUnlocked('tough-love') ? '' : '🔒'}</option>
                    <option value="shadow" ${isUnlocked('shadow') ? '' : 'disabled'}>🌑 Shadow Worker ${isUnlocked('shadow') ? '' : '🔒'}</option>
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

// --- 4. ROUTES (Auth, Journal, Stripe) ---
app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://' + req.get('host') } });
    res.send(UI_SHELL(`<div style="text-align:center; padding-top:100px;"><h2>Access Link Sent</h2><p style="color:var(--text-dim);">Verify your email to continue the protocol.</p></div>`));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.post('/add-entry', async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { text, persona, unlockedStatus } = req.body;
    if (!session) return res.redirect('/');

    let prompt = "Summarize this.";
    if (persona === 'stoic') prompt = "You are a Stoic Philosopher. Deep, calm summary.";
    if (persona === 'tough-love') prompt = "You are a Tough Love Coach. Be blunt and direct.";
    if (persona === 'shadow') prompt = "You are a Shadow Worker. Identify hidden subconscious patterns.";

    let aiSummary = "";
    try {
        const aiRes = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }],
            model: "gpt-3.5-turbo",
        });
        aiSummary = aiRes.choices[0].message.content || "";
    } catch (err) { console.error("AI Error"); }

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