const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const QRCode = require("qrcode-svg");

const generateQrSvg = (suratId) => {
  const baseUrl = process.env.FRONTEND_REDIRECT_URL || "http://localhost:3000";
  return new QRCode({
    content: `${baseUrl}/tracking-surat/${suratId}`,
    padding: 0,
    width: 90,
    height: 90,
    color: "#000000",
    background: "#ffffff",
    ecl: "H",
  }).svg();
};

const getLogoBase64 = () => {
  try {
    const logoPath = path.join(__dirname, "../public/logo-uika.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }
    console.warn("[Helper Warning]: File logo tidak ditemukan di public/images/logo-uika.png");
    return "";
  } catch (error) {
    console.error("[Helper Logo Error]:", error.message);
    return "";
  }
};

const compileSuratPengunduranDiri = async (dataSurat, tanggalSelesai, ttdBase64 = null) => {
  try {
    const templateHtml = fs.readFileSync(path.join(__dirname, "../views/persuratan/pengunduranDiri.hbs"), "utf-8");
    const compiledTemplate = handlebars.compile(templateHtml);

    return compiledTemplate({
      ...dataSurat.form_data,
      logoUrl: getLogoBase64(),
      tanggal_selesai: tanggalSelesai,
      qrCodeSvg: generateQrSvg(dataSurat.id),
      ttdBase64: ttdBase64 || null,
    });
  } catch (error) {
    console.error("[Compile Pengunduran Diri Error]:", error.message);
    throw new Error("Gagal menyusun dokumen Pengunduran Diri.");
  }
};

const compileSuratCutiAkademik = async (dataSurat, tanggalSelesai, ttdBase64 = null, namaKaprodi = null) => {
  try {
    const templateHtml = fs.readFileSync(path.join(__dirname, "../views/persuratan/cutiAkademik.hbs"), "utf-8");
    const compiledTemplate = handlebars.compile(templateHtml);

    const tglPermohonan = new Date(dataSurat.created_at).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const context = {
      ...dataSurat.form_data,

      logoUrl: getLogoBase64(),
      fakultas: "Teknik dan Sains",
      program_studi: "Teknik Informatika",
      nama_dekan: namaKaprodi || "Dr. Feril Hariati, ST., M.Eng.",

      nomor_surat: dataSurat.nomor_surat || `......./FTS/UIKA/${new Date().getFullYear()}`,
      tanggal_permohonan: tglPermohonan,
      tanggal_surat: tanggalSelesai,

      qrCodeSvg: generateQrSvg(dataSurat.id),
      ttdBase64: ttdBase64 || null,
    };

    return compiledTemplate(context);
  } catch (error) {
    console.error("[Compile Cuti Akademik Error]:", error.message);
    throw new Error("Gagal menyusun dokumen Cuti Akademik.");
  }
};

module.exports = {
  compileSuratPengunduranDiri,
  compileSuratCutiAkademik,
};
