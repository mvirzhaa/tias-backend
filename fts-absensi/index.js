const mysql = require('mysql2');
const { Client: SSHClient } = require('ssh2');

const sshConfig = {
  host: process.env.FTS_ABSEN_SSH_HOST,
  port: process.env.FTS_ABSEN_SSH_PORT || 22,
  username: process.env.FTS_ABSEN_SSH_USER,
  password: process.env.FTS_ABSEN_SSH_PASSWORD,
};

const dbConfig = {
  user: process.env.FTS_ABSEN_DB_USERNAME,
  host: process.env.FTS_ABSEN_DB_HOST,
  database: process.env.FTS_ABSEN_DB_DATABASE,
  password: process.env.FTS_ABSEN_DB_PASSWORD,
  port: 3306, 
};

const sshClient = new SSHClient();

const connectToDatabase = () => {
  return new Promise((resolve, reject) => {
    sshClient
      .on('ready', () => {
        sshClient.forwardOut(
          '127.0.0.1',
          12345,
          dbConfig.host,
          dbConfig.port,
          (err, stream) => {
            if (err) return reject(err);

            const connection = mysql.createConnection({
              user: dbConfig.user,
              host: dbConfig.host,
              database: dbConfig.database,
              password: dbConfig.password,
              port: dbConfig.port,
              stream: stream,
            });

            connection.connect((err) => {
              if (err) return reject(err);
              resolve(connection);
            });
          }
        );
      })
      .connect(sshConfig);
  });
};

module.exports = connectToDatabase;
