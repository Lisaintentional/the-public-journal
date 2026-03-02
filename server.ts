import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- THE BRANDED UI: High-Contrast Intention ---
const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
            background: #0c0a09; /* Deep stone black */
            color: #f5f5f4;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
            overflow: hidden;
        }
        .card {
            background: #ffffff; /* Pure white for maximum clarity */
            padding: 56px 40px; 
            border-radius: 2px; /* Sharp, intentional corners */
            width: 90%; max-width: 420px; 
            text-align: center;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
            animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .brand-tagline {
            font-size: 0.6rem;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: #a8a29e;
            margin-bottom: 48px;
            font-weight: 700;
        }
        h1 { font-size: 2rem; font-weight: 200; margin: 0 0 20px 0; color: #1c1917; letter-spacing: -0.02em; }
        p { color: #57534e; margin-bottom: 40px; line-height: 1.7; font-size: 1rem; }
        input {
            width: 100%; padding: 16px; margin-bottom: 16px;
            border: 1px solid #e7e5e4;
            background: #fafaf9; color: #1c1917; font-size: 1rem;
            outline: none; transition: border 0.2s;
        }
        input:focus { border-color: #1c1917; }
        button {
            width: 100%; padding: 18px; background: #1c1917; color: #ffffff;
            border: none; font-weight: 600; cursor: pointer;
            letter-spacing: 0.05em; transition: background 0.2s;
        }
        button:hover { background: #44403c; }
        .brand-footer {
            margin-top: 48px; font-size: 0.75rem; color: #d6d3d1;
            letter-spacing: 0.05em;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="brand-tagline">The Public Journal</div>
        ${content}
        <div class="brand-footer">Intentional, Not Chaotic.</div>
    </div>
</body>
</html>
`;

app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        return res.send(UI_SHELL(`
            <h1>Seek Clarity.</h1>
            <p>A minimalist space designed for those who value reflection over noise.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="email@address.com" required>
                <button type="submit">Begin Session</button>
            </form>
        `));
    }

    res.send(UI_SHELL(`
        <h1>Welcome back.</h1>
        <p>Your sanctuary is prepared.</p>
        <a href="/logout" style="color: #a8a29e; text-decoration: none; font-size: 0.8rem; border-bottom: 1px solid #e7e5e4;">End Session</a>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    const { error } = await supabase.auth.signInWithOtp({ 
        email, 
        options: { emailRedirectTo: 'https://' + req.get('host') } 
    });

    if (error) return res.send(UI_SHELL(`<h1>Notice</h1><p>${error.message}</p>`));

    res.send(UI_SHELL(`
        <h1>Check your Inbox.</h1>
        <p>A magic link has been sent to <b>${email}</b>. Click it to enter the vault.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Intentional Sanctuary live on " + PORT));