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
    <title>The Public Journal</title>
</head>
<body style="margin:0; padding:0; background-color:#000000 !important; height:100vh; width:100vw;">
    <table role="presentation" width="100%" height="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#000000;">
        <tr>
            <td align="center" valign="middle">
                <table role="presentation" width="90%" style="max-width:400px; background-color:#ffffff !important; color:#000000 !important; border-radius:2px; box-shadow: 0 40px 100px rgba(0,0,0,0.8);" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td style="padding: 60px 40px; text-align: center;">
                            <div style="font-family:sans-serif; font-size:10px; letter-spacing:4px; text-transform:uppercase; color:#a8a29e; margin-bottom:40px;">THE PUBLIC JOURNAL</div>
                            
                            ${content}
                            
                            <div style="margin-top:50px; font-family:sans-serif; font-size:11px; color:#d6d3d1; letter-spacing:1px; border-top:1px solid #f5f5f4; padding-top:20px;">
                                Intentional, Not Chaotic.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

app.get('/', async (req, res) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return res.send(UI_SHELL(`
            <h1 style="font-family:serif; font-size:28px; font-weight:400; margin:0 0 20px 0; color:#000000 !important;">Seek Clarity.</h1>
            <p style="font-family:sans-serif; color:#57534e !important; font-size:16px; line-height:1.6; margin:0 0 40px 0;">Your private sanctuary for reflection. Enter your email to begin.</p>
            <form action="/login" method="POST">
                <input type="email" name="email" placeholder="Email Address" required style="width:100%; padding:18px; border:1px solid #e7e5e4; background:#ffffff !important; color:#000000 !important; font-size:16px; margin-bottom:20px; box-sizing:border-box; border-radius:0;">
                <button type="submit" style="width:100%; padding:18px; background:#000000 !important; color:#ffffff !important; border:none; font-weight:600; text-transform:uppercase; letter-spacing:2px; cursor:pointer; border-radius:0;">Unlock Vault</button>
            </form>
        `));
    }
    res.send(UI_SHELL(`
        <h1 style="font-family:serif; font-size:28px; color:#000000 !important;">Access Granted.</h1>
        <p style="font-family:sans-serif; color:#57534e !important;">Your sanctuary is ready.</p>
        <a href="/logout" style="color:#a8a29e; text-decoration:none; font-size:12px; border-bottom:1px solid #e7e5e4;">End Session</a>
    `));
});

app.post('/login', async (req, res) => {
    const { email } = req.body;
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://' + req.get('host') } });
    res.send(UI_SHELL(`
        <h1 style="font-family:serif; font-size:28px; color:#000000 !important;">Dispatched.</h1>
        <p style="font-family:sans-serif; color:#57534e !important;">A secure link has been sent to <b>${email}</b>.</p>
    `));
});

app.get('/logout', async (req, res) => {
    await supabase.auth.signOut();
    res.redirect('/');
});

app.listen(PORT, '0.0.0.0', () => console.log("Vault Protocol active"));