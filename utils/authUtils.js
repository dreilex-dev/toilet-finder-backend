import jwt from 'jsonwebtoken';

const checkRole = (value) => {
	return  (req, res, next) =>{
	const authHeader = req.headers.authorization;
	const token = authHeader && authHeader.split(' ')[1];

	if (!token){
		return res.status(401).json({
			message: "Unauthorized, token not provided"
		});
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
		if (err){
			return res.status(403).json({
				message: "Forbidden, invalid token"
			});
		}

		if (user.role != value) {
			return res.status(403).json({
				message: "Forbidden, insufficient permissions"
			});
		}

		req.user = user;
		next();
	})
	}
}

export default checkRole;