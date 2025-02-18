import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import register from './routes/register.js';

dotenv.config();
const PORT = process.env.PORT;

const app = express();

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
	console.log(`Server started on port: ${PORT}`);
});

app.use("/api/register", register)