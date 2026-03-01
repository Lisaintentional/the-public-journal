import express, { Request, Response } from 'express';
import serverless from 'serverless-http';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let entries: string[] = ["The Zen Master is watching the stars."];

// IMPORTANT: All routes must start with /.netlify/functions/server
const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  const entriesHtml = entries.map(e => `<li>${e}</li>`).join('');
  res.send(`<h1>The Public Journal</h1><ul>${entriesHtml}</ul>`);
});

app.use('/.netlify/functions/server', router);

// This is what Netlify actually uses to "wake up" your app
export const handler = serverless(app);