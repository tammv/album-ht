// Chạy API local: npm run dev:api (Vite proxy /api → cổng 3001)
import app from './app.js';

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API chạy tại http://localhost:${port}`));
