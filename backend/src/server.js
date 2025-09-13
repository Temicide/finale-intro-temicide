<<<<<<< Updated upstream
=======


const express = require('express');
const app = express();

const path = require('path');

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '../../frontend/public')));




const apiRouter = require('./routes/api');
const mongoRouter = require('./routes/mongo');

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});




app.use('/api', apiRouter);
app.use('/api/mongo', mongoRouter);

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

console.log(process.env)
>>>>>>> Stashed changes
