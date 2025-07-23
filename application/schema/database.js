
import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool(
    {
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        database: process.env.DATABSE_NAME,
        password: process.env.DATABASE_PW
    }
).promise();

export default db;