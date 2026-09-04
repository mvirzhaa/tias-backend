require('dotenv').config();
const DB = require('./database');
DB.query("SELECT user_id, npm, email, role FROM tb_users WHERE role='Mahasiswa' LIMIT 5")
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
