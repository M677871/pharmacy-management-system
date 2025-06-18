import express from 'express';
require('dotenv').config();

const port = process.env.PORT ;
const app = express();

app.use(express.json());





app.get('/', (req, res) => {
  res.send('Hello, World!');
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});