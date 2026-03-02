import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_ANON_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const UI_SHELL = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <style>
        html, body { 
            background: #000000 !important; 
            margin: 0; padding: 0; 
            height: 100vh; width: 100vw; 
            display: flex; justify-content: center; align-items: center;
        }
        /* The Wrapper */
        .intentional-box {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 60px 40px;
            width: 90%;
            max-width: 400px;
            border-radius: 2px;
            box-shadow: 0 0 0 100vw #000000; /* Forces black outside the box */
            text-align: center;
            box-sizing: border-box;
        }
        h1 { font-family: serif; font-size: 26px; margin: 0 0 20px 0; color: #000 !important; }
        p { font-family: sans-serif; color: #555 !important; line-height: 1.6; margin-bottom: 30px; }
        input { 
            width: 100%; padding: 15px; margin-bottom: 15px; 
            border: 1px solid #ccc; background: #fff !important; color: #000 !important;
        }
        button { 
            width: 100%; padding: 15px; background: #000 !important; 
            color: #fff !important; border: none; cursor: pointer; font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="intentional-box">
        <div style="font-size: 10px; letter-spacing: 3px; color: #aaa; margin-bottom: 40px;">THE PUBLIC JOURNAL</div>
        ${content}
        <div style="margin-top: 50px; font-size: 10px; color: #ccc; border-top: 1px solid #eee; padding-top: 20px;">
            Intentional, Not Chaotic.
        </div>
    </div>
</body>
</html>
`;

app.get('/', async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return res.send(UI_SHELL(`
            <h1>Seek Clarity.</h1>
            <p>Your sanctuary for deliberate thought. Enter your email to begin.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email Address" required>
                <button type="submit">Begin Reflection</button>
            </form>
        `));
    }
    res.send(UI_SHELL(`<h1>Welcome back.</h1><p>Your vault is open.</p><a href="/logout">Logout</a>`));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://' + req.get('host') } });
    res.send(UI_SHELL(`<h1>Sent.</h1><p>Check <b>${email}</b> for your magic link.</p>`));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Live"));