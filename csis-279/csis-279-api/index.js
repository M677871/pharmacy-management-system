require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "postgres",
  database: "csis-279-practice",
  port: 5432,
});

//  Middleware: protect routes using Bearer token
// const requireAuth = (req, res, next) =>
// {
//   try {
//     const header = req.headers.authorization;
//     if (!header) 
//         return res.status(401).json({ message: "Missing Authorization header" });

//     const [type, token] = header.split(" ");
//     if (type !== "Bearer" || !token) {
//       return res.status(401).json({ message: "Use: Authorization: Bearer <token>" });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch {
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// }


app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const q = `
      INSERT INTO clients (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
    `;
    const result = await pool.query(q, [name, email, hashed]);

    return res.status(201).json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.post("/clients", async (req, res) => {
    try {
        const { name, email } = req.body;
        const q = `
            INSERT INTO clients (name, email)
            VALUES ($1, $2) 
            RETURNING id, name, email
        `;
        const result = await pool.query(q, [name, email]);
        return res.status(201).json(result.rows[0]);
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: e.message });
    }
});

/**
 *  Login
 * 1) Find by email
 * 2) Compare bcrypt
 * 3) Generate JWT
 */
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const q = `SELECT id, name, email, password FROM clients WHERE email = $1`;
    const result = await pool.query(q, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const client = result.rows[0];

    const ok = await bcrypt.compare(password, client.password); 
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: client.id, email: client.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    return res.json({
      token,
      client: { id: client.id, name: client.name, email: client.email },
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

/**
 * Example protected route: return ONLY the logged-in client
 */
app.get("/me", /*requireAuth,*/ async (req, res) => {
  try {
    const q = `SELECT id, name, email FROM clients WHERE id = $1`;
    const result = await pool.query(q, [req.user.id]);
    return res.json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.put("/clients/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "Client ID is required" });
    }


    const { name, email } = req.body;
    const q = `
      UPDATE clients
      SET name = $1, email = $2
        WHERE id = $3
        RETURNING id, name, email
    `;

    const result = await pool.query(q, [name, email, id]);
    return res.status(200).json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});


app.delete("/clients/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const q = `DELETE FROM clients WHERE id = $1`;
        await pool.query(q, [id]);
        return res.status(204).send();
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});


/**
 * Example protected route: /clients/:id
 * Authorization rule (without roles):
 * - client can only access his own record
 */
app.get("/clients/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // const requestedId = Number(req.params.id);

    // if (requestedId !== req.user.id) {
    //   return res.status(403).json({ message: "Forbidden: you can only access your own data" });
    // }

    const q = `SELECT id, name, email FROM clients WHERE id = $1`;
    const result = await pool.query(q, [id]);

    return res.json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});

app.get("/clients", async (req, res) => {
  try {
    const q = `SELECT id, name, email FROM clients ORDER BY id`;
    const result = await pool.query(q);
    return res.json(result.rows);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});


app.get("/department", async (req, res) => {
  try{
    const q = `select * from department`;
    const result = await pool.query(q);
    return res.status(200).json(result.rows);
  }
  catch(e)
  {
    res.status(500).json({message : e.message})
  }
})


app.post("/department", async (req, res) =>
{
  try {
    const {name , description } = req.body;

    const query = ` insert into department (name , description) values ($1, $2) returning *`;
    const result = await pool.query(query, [name, description]);
    res.status(201).json(result.rows[0]);

  }
  catch(e)
  {
    console.log(e);
    return res.status(500).json({message: e.message});
  }
})

app.put("/department/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: "name and description are required" });
    }

    const query = `
      UPDATE department
      SET name = $1, description = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "department not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});


app.delete("/department/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM department WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "department not found" });
    }

    return res.status(204).send();
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
});


app.listen(process.env.PORT || 3001, () => {
  console.log(`server is running on port: ${process.env.PORT || 3001}`);
});
