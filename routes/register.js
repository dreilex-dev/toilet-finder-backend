import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const router = express.Router();

router.post('/', async(req, res) => {
	const {username, password} = req.body;

	try{
		if (!username || !password) {
			return res.status(400).json({
				message: "All fields are required"
			});
		}

		const existingUsername = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
		// return res.status(200).json({
		// 	message: existingUsername
		// })

		if (existingUsername.length > 0){
			return res.status(409).json({
				message: "Username already exists."
			});
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		await pool.query('INSERT INTO users (username, password) VALUES (?,?)', [username, hashedPassword]);
		return res.status(201).json({
			message: "User has been created succesfully."
		});

	} catch (error){
		console.error('Error during registration: ', error);
		return res.status(500).json({
			message: "Internal server error"
		});
	}
});

export default router;