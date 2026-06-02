const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT email, "passwordHash" FROM "User" WHERE email = $1', ['alice6@example.com'])
  .then(res => {
    console.log("DB VERIFICATION RESULTS:");
    console.log(res.rows[0]);
    if (res.rows[0].passwordHash.startsWith('$2a$')) {
      console.log("HASH IS VALID BCRYPT");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
