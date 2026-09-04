const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "verification-app",
  }),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Silakan scan QR code untuk login WhatsApp.");
});

client.on("ready", () => {
  console.log("WhatsApp Client sudah siap digunakan!");
});

client.on("disconnected", (reason) => {
  console.log("WhatsApp Client terputus:", reason);
});

const sendVerificationToken = async (phoneNumber, message) => {
  try {
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "62" + phoneNumber.slice(1);
    }

    const chatId = phoneNumber + "@c.us";

    console.log(`Sending message to: ${chatId}`);

    if (!client) {
      console.error("WhatsApp client is not initialized.");
      return;
    }

    await client.sendMessage(chatId, message);
    console.log(`Token verifikasi berhasil dikirim ke ${chatId}`);
  } catch (error) {
    console.error("Gagal mengirim token verifikasi:", error);
  }
};

module.exports = {
  whatsapp: client,
  sendVerificationToken,
};
