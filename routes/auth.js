import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';


const router = express.Router();

router.post('/', async (req, res) => {
    const {username, password} = req.body;

    try{
        const user = await pool.query("SELECT * FROM users WHERE username = ?", [username]);

        if (user.length === 0){
            return res.status(401).json({message: "User not found"});
        }

        const userData = user[0];

        const validPassword = await bcrypt.compare (password, userData.password);
        if(!validPassword){
            return res.status(401).json({message: "User not found"});
        }

    const token = jwt.sign(
        {id: userData.id, username: userData.username, role: userData.role},
        process.env.JWT_SECRET,
        {expiresIn: "1h"}
    )

    res.json({message: "Login successful", token});
    } catch (error) {
        console.error("Error in login", error);
        res.status(500).json({message: "Internal server error"});
    }
});

export default router;
