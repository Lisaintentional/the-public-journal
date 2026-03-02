import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- THE BRANDED UI: High-Contrast Sanctuary ---
const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Public Journal</title>
    <style>
        /* Force reset to prevent any hidden default styles */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
            background-color: #000000 !important; /* Pure black background */
            display: flex; 
            justify-content: center; 
            align-items: center;
            min-height: 100vh;
            width: 100vw;
        }

        .card {
            background-color: #ffffff !important; /* Pure white card */
            padding: 60px 40px;
            width: 90%;
            max-width: 420px;
            text-align: center;
            border-radius: 2px;
            box-shadow: 0 40px 100px rgba(0, 0, 0, 0.9);
            z-index: 10;
            display: block !important; /* Ensure it's not hidden */
        }

        .brand-logo {
            font-size: 0.65rem;
            letter-spacing: 0.4em;
            text-transform: uppercase;
            color: #a8a29e;
            margin-bottom: 50px;
            font-weight: 600;
        }

        h1 {
            font-family: "Georgia", serif;
            font-size: 2rem;
            font-weight: 400;
            color: #000000;
            margin-bottom: 20px;
        }

        p {
            color: #57534e;
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 40px;
        }

        input {
            width: 100%;
            padding: 18px;
            border: 1px solid #e7e5e4;
            background: #ffffff;
            color: #000000;
            font-size: 1rem;
            margin-bottom: 15px;
            outline: none;
        }

        button {
            width: 100%;
            padding: 18px;
            background: #000000;
            color: #ffffff;
            border: none;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            cursor: pointer;
        }

        .brand-footer {
            margin-top: 50px;
            font-size: 0.7rem;
            color: #d6d3d1;
            letter-spacing: 0.1em;
            border-top: 1px solid #f5f5f4;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <main class="card">
        <div class="brand-logo">The Public Journal</div>
        ${content}
        <div class="brand-footer">Intentional, Not Chaotic.</div>
    </main>
</body>
</html>
`;

app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        return res.send(UI_SHELL(`
            <h1>Begin Reflection.</h1>
            <p>A minimalist sanctuary for clarity. Step away from the chaos.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Enter email" required>
                <button type="submit">Unlock Vault</button>
            </form>
        `));
    }

    res.send(UI_SHELL(`
        <h1>Access Granted.</h1>
        <p>Your sanctuary is ready.</p>
        <a href="/logout" style="color: #a8a29e; text-decoration: none; font-size: 0.8rem;">End Session</a>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ 
        email, 
        options: { emailRedirectTo: 'https://' + req.get('host') } 
    });

    res.send(UI_SHELL(`
        <h1>Dispatched.</h1>
        <p>A magic link has been sent to <b>${email}</b>.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Vault live on " + PORT));