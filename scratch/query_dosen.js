const DB = require('./database');
DB.query("SELECT * FROM tb_users WHERE role='Dosen' LIMIT 5")
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
