import express from 'express';
import test from 'node:test';
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

// src/config/testConnection.ts

import sequelize from '../config/db';

const testConnection = async () => {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate(); // actual connection test
    console.log('✅ Database connection successful!');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1); // exit the process if connection fails
  }
};

testConnection();
