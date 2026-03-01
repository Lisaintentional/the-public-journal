import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// This is the app's "temporary memory"
let entries: string[] = ["The Zen Master is watching the stars.", "First public entry!"];

app.get('/', (req: Request, res: Response) => {
  const entriesHtml = entries.map(e => `<li style="padding: 10px; border-bottom: 1px solid #ddd;">${e}</li>`).join('');
  
  res.send(`
    <html>
      <body style="font-family: sans-serif; max-width: 500px; margin: 50px auto; text-align: center; background-color: #f4f4f9;">
        <h1 style="color: #333;">The Public Journal</h1>
        
        <form action="/add-entry" method="POST" style="margin-bottom: 30px;">
          <input type="text" name="entry" placeholder="What's on your mind?" required style="padding: 10px; width: 70%;">
          <button type="submit" style="padding: 10px; cursor: pointer; background: #333; color: white; border: none;">Post</button>
        </form>

        <ul style="list-style: none; padding: 0; text-align: left; background: white; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          ${entriesHtml}
        </ul>
      </body>
    </html>
  `);
});

app.post('/add-entry', (req: Request, res: Response) => {
  const newEntry = req.body.entry;
  if (newEntry) {
    entries.unshift(newEntry);
  }
  res.redirect('/');
});

// THIS IS THE PART RENDER NEEDS TO STAY ALIVE:
app.listen(PORT, () => {
  console.log(`-----------------------------------------`);
  console.log(`ZEN MASTER: The Offline is now breathing.`);
  console.log(`SERVER STATUS: Live on Port ${PORT}`);
  console.log(`-----------------------------------------`);
});