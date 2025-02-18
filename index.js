import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import pool from './config/db.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
	console.log(`Server started on port: ${PORT}`);
});