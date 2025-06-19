# Pharmacy Management System

A full-stack web application for a pharmacy that helps admins and employees manage inventory and lets clients purchase medicines.

## 🏗️ Tech Stack

- **Backend:** Node.js, Express, TypeScript, Sequelize ORM, MySQL
- **Frontend:** React.js, TypeScript
- **Authentication:** JWT
- **Environment Management:** dotenv
- **Dev Tools:** ts-node-dev, nodemon

## 📁 Project Structure

```
pharmacy-management-system/
├── src/
│   ├── config/
│   │   └── database.ts
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── createDatabase.ts
│   └── index.ts
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/M677871/pharmacy-management-system.git
   cd pharmacy-management-system
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   - Create a `.env` file in the project root based on the example:
     ```env
     DB_HOST=127.0.0.1
     DB_PORT=3307
     DB_USER=root
     DB_PASS=root
     DB_NAME=pharmacy_db
     PORT=3000
     NODE_ENV=development
     JWT_SECRET=your_jwt_secret
     SESSION_SECRET=your_session_secret
     ```
4. **Create Database**
   ```bash
   npm run create-db
   ```
5. **Run in development mode**
   ```bash
   npm run dev
   ```
6. **Build and run production**
   ```bash
   npm run build
   npm start
   ```

## 🔧 NPM Scripts

| Script         | Description                                |
|----------------|--------------------------------------------|
| `npm run create-db` | Create the MySQL database if not exists |
| `npm run dev`       | Start server in dev mode (hot reload)    |
| `npm run build`     | Compile TypeScript to JavaScript         |
| `npm start`         | Run compiled code from `dist/`           |

## 🔒 Environment Variables

- `DB_HOST` — Database host
- `DB_PORT` — Database port
- `DB_USER` — Database user
- `DB_PASS` — Database password
- `DB_NAME` — Database name
- `PORT` — Server port
- `NODE_ENV` — `development` or `production`
- `JWT_SECRET` — Secret key for JWT
- `SESSION_SECRET` — Secret key for sessions

## 📚 Further Development

- Define Sequelize models (`User`, `Medicine`, `Order`)
- Implement authentication routes
- Build React frontend with role-based views
- Add unit & integration tests
- Configure CI/CD pipeline
