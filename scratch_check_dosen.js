require('dotenv').config();
const User = require('./models/User');
const Pembelajaran = require('./models/absensi-dosen/Pembelajaran');

async function check() {
  try {
    const user = await User.findOne({ where: { role: 'Dosen' }, raw: true });
    console.log("=== Contoh tb_users (Dosen) ===");
    console.log(user);

    const pembelajaran = await Pembelajaran.findOne({ raw: true });
    console.log("\n=== Contoh pembelajaran_dosen_ext ===");
    console.log(pembelajaran);

    // See if they join
    if (pembelajaran && user) {
        console.log("\nType of user_id:", typeof user.user_id, " Value:", user.user_id);
        console.log("Type of id_dosen:", typeof pembelajaran.id_dosen, " Value:", pembelajaran.id_dosen);
        console.log("Type of nik_dosen:", typeof pembelajaran.nik_dosen, " Value:", pembelajaran.nik_dosen);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
