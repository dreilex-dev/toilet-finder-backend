import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import toilets from './routes/toilets.js';

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
	console.log(`Server started on port: ${PORT}`);
});

// Comentăm temporar rutele de autentificare pentru implementări viitoare
// app.use("/api/register", register);
// app.use("/api/auth", auth);

app.use("/api/toilets", toilets);