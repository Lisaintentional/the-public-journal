import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Using Number() ensures the PORT is a valid number for Render's environment
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- THE BRANDED UI: Intentional, Not Chaotic ---
const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Modern reset to ensure no "Default Blue" remains */
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Inter", sans-serif;
            background: #fafaf9; /* A warm, intentional off-white */
            background-image: radial-gradient(circle at top right, #f5f5f4, #e7e5e4);
            color: #44403c;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
        }
        .card {
            background: #ffffff;
            padding: 48px; border-radius: 4px; /* Minimalist sharp edges for intention */
            border: 1px solid #e7e5e4;
            width: 90%; max-width: 400px; text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }
        .brand-header {
            font-size: 0.65rem;
            letter-spacing: 0.25em;
            text-transform: uppercase;
            color: #a8a29e;
            margin-bottom: 40px;
        }
        .icon { font-size: 2rem; margin-bottom: 24px; display: block; filter: grayscale(1); }
        h1 { font-size: 1.75rem; font-weight: 300; margin: 0 0 16px 0; color: #1c1917; }
        p { color: #78716c; margin-bottom: 32px; line-height: 1.6; font-size: 0.95rem; }
        input {
            width: 100%; padding: 14px; margin-bottom: 12px;
            border-radius: 2px; border: 1px solid #d6d3d1;
            background: #fff; color: #1c1917; font-size: 1rem;
        }
        button {
            width: 100%; padding: 14px; background: #1c1917; color: #fafaf9;
            border: none; border-radius: 2px; font-weight: 500; cursor: pointer;
            transition: opacity 0.2s;
        }
        button:hover { opacity: 0.9; }
        .footer-brand {
            margin-top: 32px; font-size: 0.7rem; color: #d6d3d1; font-style: italic;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="brand-header">The Public Journal</div>
        ${content}
        <div class="footer-brand">Intentional, Not Chaotic.</div>
    </div>
</body>
</html>
`;

app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        return res.send(UI_SHELL(`
            <h1>A space for clarity.</h1>
            <p>Your sanctuary for deliberate thought. Enter your email to begin.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email Address" required>
                <button type="submit">Begin Reflection</button>
            </form>
        `));
    }

    res.send(UI_SHELL(`
        <h1>Welcome back.</h1>
        <p>Your vault is secure and ready for your thoughts.</p>
        <a href="/logout" style="color: #a8a29e; text-decoration: none; font-size: 0.8rem;">End Session</a>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    // Dynamically setting the redirect helps prevent Render loading loops
    const { error } = await supabase.auth.signInWithOtp({ 
        email, 
        options: { emailRedirectTo: 'https://' + req.get('host') } 
    });

    if (error) return res.send(UI_SHELL(`<h1>Notice</h1><p>${error.message}</p>`));

    res.send(UI_SHELL(`
        <h1>Check your inbox.</h1>
        <p>An intentional link has been sent to <b>${email}</b>. Use it to enter the sanctuary.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Intentional Sanctuary live on " + PORT));