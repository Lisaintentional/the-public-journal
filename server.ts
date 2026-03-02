import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// Force PORT to be a number to stop the TypeScript build error
const PORT = Number(process.env.PORT) || 3000;

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- THE SERENE UI ---
const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
            color: #f8fafc;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0;
        }
        .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            padding: 40px; border-radius: 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            width: 90%; max-width: 400px; text-align: center;
        }
        .icon { font-size: 3rem; margin-bottom: 20px; display: block; }
        h1 { font-size: 2rem; margin: 0 0 10px 0; }
        p { color: #94a3b8; margin-bottom: 30px; line-height: 1.6; }
        input {
            width: 100%; padding: 15px; margin-bottom: 15px;
            border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(15, 23, 42, 0.6); color: white;
        }
        button {
            width: 100%; padding: 15px; background: white; color: #1e1b4b;
            border: none; border-radius: 12px; font-weight: 700; cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="card">${content}</div>
</body>
</html>
`;

app.get('/', async (req: Request, res: Response) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
        return res.send(UI_SHELL(`
            <span class="icon">🌿</span>
            <h1>Welcome Home.</h1>
            <p>Your private sanctuary for reflection. Enter your email to step inside.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="email@example.com" required>
                <button type="submit">Step Inside</button>
            </form>
        `));
    }

    res.send(UI_SHELL(`
        <h1>Hello.</h1>
        <p>You are in your safe space.</p>
        <a href="/logout" style="color: #94a3b8; text-decoration: none;">Leave Sanctuary</a>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    const { error } = await supabase.auth.signInWithOtp({ 
        email, 
        options: { emailRedirectTo: 'https://' + req.get('host') } 
    });

    if (error) return res.send(UI_SHELL(`<h1>Error</h1><p>${error.message}</p>`));

    res.send(UI_SHELL(`
        <span class="icon">✉️</span>
        <h1>Check your email.</h1>
        <p>We've sent a magic link to <b>${email}</b>.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Sanctuary live on " + PORT));