import express from 'express';
import cors from 'cors';

import { getSalesData } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/sales', async (req, res) => {
    try {
        const data = await getSalesData();
        res.json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
