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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="color-scheme" content="light only">
    <title>The Public Journal</title>
    <style>
        /* Absolute reset to kill the "Still Black" bug */
        html, body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            background-color: #000000 !important; /* Force background black */
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }

        .card {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            background-color: #ffffff !important; /* Force card white */
            color: #000000 !important;
            width: 90%;
            max-width: 400px;
            padding: 60px 40px;
            box-shadow: 0 50px 100px rgba(0,0,0,0.9);
            text-align: center;
            border-radius: 2px;
            box-sizing: border-box;
            position: relative;
            z-index: 999;
        }

        .brand-logo {
            font-size: 10px;
            letter-spacing: 4px;
            text-transform: uppercase;
            color: #a8a29e;
            margin-bottom: 40px;
            font-family: sans-serif;
        }

        h1 {
            font-family: "Georgia", serif;
            font-size: 28px;
            font-weight: 400;
            margin-bottom: 20px;
            color: #000000;
        }

        p {
            font-family: sans-serif;
            color: #57534e;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 40px;
        }

        input {
            width: 100%;
            padding: 18px;
            border: 1px solid #e7e5e4;
            background: #ffffff;
            color: #000000;
            font-size: 16px;
            margin-bottom: 20px;
            box-sizing: border-box;
            border-radius: 0;
        }

        button {
            width: 100%;
            padding: 18px;
            background: #000000;
            color: #ffffff;
            border: none;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            border-radius: 0;
        }

        .brand-footer {
            margin-top: 50px;
            font-size: 11px;
            color: #d6d3d1;
            letter-spacing: 1px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="brand-logo">The Public Journal</div>
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
            <p>Step away from the noise. Enter your email to begin your reflection.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email Address" required>
                <button type="submit">Unlock Vault</button>
            </form>
        `));
    }

    res.send(UI_SHELL(`
        <h1>Access Granted.</h1>
        <p>Your sanctuary is ready for your thoughts.</p>
        <a href="/logout" style="color: #a8a29e; text-decoration: none; font-size: 12px; border-bottom: 1px solid #e7e5e4;">End Session</a>
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
        <p>A secure link has been sent to <b>${email}</b>. Click it to enter.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Vault Protocol active on " + PORT));