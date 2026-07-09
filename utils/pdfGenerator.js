"use strict";

const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Membaca logo UIKA dan mengkonversi ke base64 data URI.
 * @returns {string|null}
 */
const getLogoBase64 = () => {
  try {
    const logoPath = path.join(__dirname, "../public/logo-uika.png");
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${buffer.toString("base64")}`;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Generate QR code sebagai base64 PNG data URI.
 * @param {string} suratId
 * @returns {Promise<string|null>}
 */
const generateQrBase64 = async (suratId) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const url = `${baseUrl}/tracking-surat/${suratId}`;
    // qrcode library: toDataURL returns "data:image/png;base64,..."
    const dataUrl = await QRCode.toDataURL(url, { width: 90, margin: 1 });
    return dataUrl;
  } catch {
    return null;
  }
};

// Inisialisasi pdfmake singleton dan daftarkan Roboto fonts ke virtualfs
// Dilakukan satu kali saat module pertama kali di-load
const _pdfmake = require("pdfmake");
const _vfs = require("pdfmake/build/vfs_fonts");

// Load font buffers ke virtual file system pdfmake
Object.keys(_vfs).forEach((key) => {
  _pdfmake.virtualfs.writeFileSync(key, Buffer.from(_vfs[key], "base64"));
});

// Daftarkan font Roboto dengan nama file (resolving dari virtualfs)
_pdfmake.addFonts({
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
  Times: {
    normal: "Times-Roman",
    bold: "Times-Bold",
    italics: "Times-Italic",
    bolditalics: "Times-BoldItalic",
  },
});

// Policy: izinkan akses file lokal, blokir URL eksternal
_pdfmake.setLocalAccessPolicy(() => true);
_pdfmake.setUrlAccessPolicy(() => false);

/**
 * Menulis PDF dari docDefinition pdfmake ke file.
 * Kompatibel dengan pdfmake v0.3.x.
 * @param {object} docDefinition  - pdfmake document definition
 * @param {string} outputFilePath - absolute path tujuan file PDF
 * @returns {Promise<void>}
 */
const writePdf = async (docDefinition, outputFilePath) => {
  const doc = _pdfmake.createPdf(docDefinition);
  await doc.write(outputFilePath);
};

// ─── Document Builders ────────────────────────────────────────────────────────

/**
 * Generate PDF Surat Pengunduran Diri ke file.
 * @param {object} dataSurat      - record Surat dari DB
 * @param {string} tanggalStr     - tanggal selesai (string teks)
 * @param {string|null} ttdBase64     - TTD mahasiswa sebagai data URI base64
 * @param {string|null} ttdOrtuBase64 - TTD orang tua/wali sebagai data URI base64
 * @param {string} namaOrtuDB         - Nama orang tua dari database (fallback ke form_data)
 * @param {string} outputPath         - absolute path file PDF tujuan
 * @returns {Promise<void>}
 */
const generateSuratPengunduranDiri = async (dataSurat, tanggalStr, ttdBase64, ttdOrtuBase64, namaOrtuDB, outputPath) => {
  const fd = dataSurat.form_data || {};
  const pengirim = dataSurat.Pengirim || {};
  const pd = pengirim.personal_data || {};

  const namaLengkap = fd.nama_lengkap || pd.nama_lengkap || "-";
  const npmStr = fd.npm || pengirim.npm || pengirim.nidn || "-";
  const alamatStr = fd.alamat || pd.alamat || "-";
  const noHpStr = fd.no_hp || pd.no_hp || "-";

  const logoBase64 = getLogoBase64();
  const qrBase64 = await generateQrBase64(dataSurat.id);

  const ttdSection = ttdBase64
    ? [{ image: ttdBase64, width: 80, alignment: "center", margin: [0, 0, 0, 4] }]
    : [{ text: "", margin: [0, 40, 0, 4] }];

  const ttdOrtuSection = ttdOrtuBase64
    ? [{ image: ttdOrtuBase64, width: 80, alignment: "center", margin: [0, 0, 0, 4] }]
    : [{ text: "", margin: [0, 40, 0, 4] }];



  const content = [];

  content.push(
    // ── Judul ──
    {
      text: "SURAT PERMOHONAN PENGUNDURAN DIRI SEBAGAI MAHASISWA",
      bold: true,
      decoration: "underline",
      fontSize: 12.5,
      alignment: "center",
      margin: [0, 0, 0, 16],
    },

    // ── Kepada ──
    { text: "Yth. Dekan Fakultas Teknik dan Sains", bold: true },
    { text: "TU Prodi Teknik Informatika", bold: true },
    { text: "Universitas Ibn Khaldun Bogor", bold: true, margin: [0, 0, 0, 16] },
    { text: "Yang bertanda tangan dibawah ini,", margin: [0, 0, 0, 8] },

    // ── Tabel Biodata ──
    {
      table: {
        widths: ["25%", "3%", "*"],
        body: [
          [
            { text: "Nama", border: [false, false, false, false] },
            { text: ":", border: [false, false, false, false] },
            { text: namaLengkap, border: [false, false, false, false] },
          ],
          [
            { text: "NPM", border: [false, false, false, false] },
            { text: ":", border: [false, false, false, false] },
            { text: String(npmStr), border: [false, false, false, false] },
          ],
          [
            { text: "Program Studi", border: [false, false, false, false] },
            { text: ":", border: [false, false, false, false] },
            { text: "Teknik Informatika", border: [false, false, false, false] },
          ],
          [
            { text: "Semester", border: [false, false, false, false] },
            { text: ":", border: [false, false, false, false] },
            { text: String(fd.semester || "-"), border: [false, false, false, false] },
          ],
          [
            { text: "Alamat", border: [false, false, false, false] },
            { text: ":", border: [false, false, false, false] },
            { text: alamatStr, border: [false, false, false, false] },
          ],
          [
            { text: "No. Telepon/HP", border: [false, false, false, false] },
            { text: ":", border: [false, false, false, false] },
            { text: String(noHpStr), border: [false, false, false, false] },
          ],
        ],
      },
      margin: [12, 0, 0, 16],
    },

    // ── Isi Paragraf ──
    {
      text: [
        "Mengajukan ",
        { text: "Permohonan Undur Diri", bold: true },
        ` sebagai mahasiswa Universitas Ibn Khaldun Bogor. Setelah mendapatkan pengarahan dan penjelasan terkait kuota Beasiswa KIP Kuliah yang dilaksanakan pada hari ${fd.tanggal_pengarahan || "-"}. Saya telah mempertimbangkan keputusan ini dengan matang bersama kedua Orang Tua dan penuh tanggung jawab.`,
      ],
      alignment: "justify",
      margin: [0, 0, 0, 12],
    },
    {
      text: "Sehubungan dengan hal tersebut, saya memutuskan untuk mengundurkan diri dari Penerima Program Beasiswa KIP Kuliah serta berhenti sebagai mahasiswa Fakultas Teknik dan Sains, Program Studi Teknik Informatika di Universitas Ibn Khaldun Bogor. Keputusan ini saya ambil sebagai langkah terbaik setelah memahami kondisi dan ketentuan yang berlaku.",
      alignment: "justify",
      margin: [0, 0, 0, 12],
    },
    {
      text: "Saya mengucapkan terima kasih yang sebesar-besarnya kepada Universitas Ibn Khaldun Bogor, Fakultas Teknik dan Sains, serta seluruh dosen dan staf akademik atas bimbingan, ilmu, dan pengalaman yang telah saya peroleh selama menjalani studi. Saya menyadari bahwa pengunduran diri ini dapat berdampak pada status akademik maupun administrasi saya, dan dengan ini saya menyatakan siap menerima segala konsekuensi yang berlaku sesuai dengan ketentuan universitas.",
      alignment: "justify",
      margin: [0, 0, 0, 12],
    },
    {
      text: "Demikian permohonan pengunduran diri ini saya sampaikan. Besar harapan saya agar proses pengunduran diri dapat berjalan dengan lancar. Atas perhatian dan pengertiannya, saya ucapkan terima kasih.",
      alignment: "justify",
      margin: [0, 0, 0, 30],
    },

    // ── Footer Tanda Tangan ──
    {
      unbreakable: true,
      stack: [
        {
          columns: [
            { text: "", width: "50%" },
            { text: `Bogor, ${tanggalStr}`, alignment: "center", width: "50%" },
          ],
        },
        {
          columns: [
            { text: "Mengetahui,\nOrang Tua/Wali", width: "50%", margin: [0, 8, 0, 0] },
            { text: "Hormat Saya,", alignment: "center", width: "50%", margin: [0, 8, 0, 0] },
          ],
        },
        {
          columns: [
            {
              stack: [
                ...ttdOrtuSection,
                { text: namaOrtuDB, bold: true, alignment: "center", margin: [0, 4, 0, 0] },
              ],
              width: "50%",
              alignment: "center",
            },
            {
              stack: [
                ...ttdSection,
                { text: namaLengkap, bold: true, alignment: "center", margin: [0, 4, 0, 0] },
                { text: `NPM: ${String(npmStr)}`, alignment: "center" },
              ],
              width: "50%",
              alignment: "center",
            },
          ],
        }
      ]
    }
  );

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [50, 40, 50, 40],
    defaultStyle: { font: "Times", fontSize: 12, lineHeight: 1.5 },
    content,
  };

  await writePdf(docDefinition, outputPath);
};

/**
 * Generate PDF Surat Cuti Akademik ke file.
 * @param {object} dataSurat      - record Surat dari DB
 * @param {string} tanggalStr     - tanggal surat (string teks)
 * @param {string|null} ttdBase64 - TTD kaprodi sebagai data URI base64
 * @param {string} namaKaprodi    - nama kaprodi/penandatangan
 * @param {string} outputPath     - absolute path file PDF tujuan
 * @returns {Promise<void>}
 */
const generateSuratCutiAkademik = async (dataSurat, tanggalStr, ttdBase64, namaKaprodi, outputPath) => {
  const fd = dataSurat.form_data || {};
  const pengirim = dataSurat.Pengirim || {};
  const pd = pengirim.personal_data || {};

  const namaLengkap = fd.nama_lengkap || pd.nama_lengkap || "-";
  const npmStr = fd.npm || pengirim.npm || pengirim.nidn || "-";
  const alamatStr = fd.alamat || pd.alamat || "-";

  const logoBase64 = getLogoBase64();
  const qrBase64 = await generateQrBase64(dataSurat.id);

  const tglPermohonan = new Date(dataSurat.created_at).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const nomorSurat = dataSurat.nomor_surat || `......./FTS/UIKA/${new Date().getFullYear()}`;
  const namaDekan = namaKaprodi || "Dr. Feril Hariati, ST., M.Eng.";

  const ttdSection = ttdBase64
    ? [{ image: ttdBase64, width: 80, alignment: "center", margin: [0, 0, 0, 4] }]
    : [{ text: "", margin: [0, 40, 0, 4] }];

  // Kiri header: logo + nama univ
  const headerLeftStack = [];
  if (logoBase64) {
    headerLeftStack.push({ image: logoBase64, width: 55 });
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [45, 30, 45, 30], // Margin dilonggarkan agar lebih rapi
    defaultStyle: { font: "Times", fontSize: 11, lineHeight: 1.35 }, // Ukuran font dan spasi dinaikkan
    content: [
      // ── Header: Logo + Nama Universitas + Form Box ──
      {
        columns: [
          // Kolom 1: Logo
          logoBase64
            ? { image: logoBase64, width: 65, margin: [0, 0, 0, 0] }
            : { text: "", width: 65 },
          // Kolom 2: Teks Universitas
          {
            stack: [
              { text: "UNIVERSITAS IBN KHALDUN BOGOR", bold: true, fontSize: 13 },
              {
                text: "Jl. KH. Sholeh Iskandar Km. 2 Kedung Badak Bogor, Telp. (0251) 316452",
                fontSize: 8.5,
                margin: [0, 2, 0, 0],
              },
            ],
            width: "*",
            margin: [12, 6, 0, 0], // Margin kiri untuk jarak dengan logo
          },
          // Kolom 3: Form box
          {
            table: {
              widths: [130],
              body: [
                [{ text: "Form : 04", bold: true, alignment: "center", fontSize: 7.5 }],
                [
                  {
                    text: "1. Putih Untuk Mahasiswa\n2. Hijau untuk Rektor\n3. Biru untuk Kepala BAAK\n4. Merah untuk Ketua Jurusan\n5. Kuning untuk PA",
                    fontSize: 7,
                  },
                ],
              ],
            },
            width: "auto",
          },
        ],
        margin: [0, 0, 0, 6],
      },


      // ── Garis Pemisah ──
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2.5 }], margin: [0, 2, 0, 10] },

      // ── Kepada Yth + Title Box ──
      {
        columns: [
          {
            stack: [
              { text: "Kepada Yth :", margin: [0, 0, 0, 4] },
              {
                table: {
                  widths: [75, 8, "*"],
                  body: [
                    [
                      { text: "Saudara", border: [false, false, false, false] },
                      { text: ":", border: [false, false, false, false] },
                      { text: namaLengkap, bold: true, border: [false, false, false, false] },
                    ],
                    [
                      { text: "NPM", border: [false, false, false, false] },
                      { text: ":", border: [false, false, false, false] },
                      { text: String(npmStr), border: [false, false, false, false] },
                    ],
                    [
                      { text: "Fak./Jurusan", border: [false, false, false, false] },
                      { text: ":", border: [false, false, false, false] },
                      { text: "Teknik dan Sains", border: [false, false, false, false] },
                    ],
                    [
                      { text: "Program Studi", border: [false, false, false, false] },
                      { text: ":", border: [false, false, false, false] },
                      { text: "Teknik Informatika", border: [false, false, false, false] },
                    ],
                    [
                      { text: "Alamat", border: [false, false, false, false] },
                      { text: ":", border: [false, false, false, false] },
                      { text: alamatStr, border: [false, false, false, false] },
                    ],
                  ],
                },
              },
            ],
            width: "58%",
          },
          {
            table: {
              widths: ["*"],
              body: [
                [{ text: "Surat Izin\nCuti Akademik", bold: true, alignment: "center", fontSize: 10, margin: [4, 4, 4, 4] }],
                [{ text: `No: ${nomorSurat}`, alignment: "center", fontSize: 9, margin: [4, 4, 4, 4] }],
              ],
            },
            width: "42%",
            alignment: "right",
          },
        ],
        margin: [0, 0, 0, 10],
      },

      // ── Isi Surat ──
      {
        text: [
          "Menunjuk surat permohonan Cuti Akademik Saudara tertanggal ",
          { text: tglPermohonan, bold: true },
          ", dengan ini diberitahukan bahwa Saudara diizinkan untuk cuti akademik pada :",
        ],
        alignment: "justify",
        margin: [0, 0, 0, 6],
      },

      // Tabel semester cuti
      {
        columns: [
          { text: "", width: "42%" },
          {
            table: {
              widths: ["*", "*"],
              body: [
                [
                  { text: "Semester", bold: true, fillColor: "#f5f5f5" },
                  { text: "Tahun Akademik", bold: true, fillColor: "#f5f5f5" },
                ],
                [
                  { text: String(fd.semester_cuti || "-") },
                  { text: String(fd.tahun_akademik_cuti || "-") },
                ],
              ],
            },
            width: "58%",
          },
        ],
        margin: [0, 0, 0, 8],
      },

      {
        text: "Selanjutnya, untuk mengikuti kegiatan akademik kembali, Saudara harus mengajukan permohonan untuk aktif kembali dan melakukan registrasi ulang pada masa registrasi yang telah ditetapkan dalam kalender akademik untuk :",
        alignment: "justify",
        margin: [0, 0, 0, 6],
      },

      // Tabel semester aktif kembali
      {
        columns: [
          { text: "", width: "42%" },
          {
            table: {
              widths: ["*", "*"],
              body: [
                [
                  { text: "Semester", bold: true, fillColor: "#f5f5f5" },
                  { text: "Tahun Akademik", bold: true, fillColor: "#f5f5f5" },
                ],
                [
                  { text: String(fd.semester_aktif || "-") },
                  { text: String(fd.tahun_akademik_aktif || "-") },
                ],
              ],
            },
            width: "58%",
          },
        ],
        margin: [0, 0, 0, 8],
      },

      {
        text: "dan melaksanakan ketentuan-ketentuan yang telah ditetapkan, setelah dinyatakan aktif mengikuti perkuliahan kembali.",
        alignment: "justify",
        margin: [0, 0, 0, 8],
      },
      { text: "Demikian, harap saudara maklum adanya.", margin: [40, 0, 0, 16] },

      // ── Tanda Tangan ──
      {
        unbreakable: true,
        stack: [
          {
            columns: [
              { text: "", width: "50%" },
              { text: `Bogor, ${tanggalStr}`, alignment: "center", width: "50%" },
            ],
          },
          {
            columns: [
              { text: "", width: "50%" },
              {
                text: "Ketua Program Studi Teknik Informatika",
                alignment: "center",
                width: "50%",
                margin: [0, 2, 0, 0],
              },
            ],
          },
          {
            columns: [
              { text: "", width: "50%" },
              {
                stack: [
                  ...ttdSection,
                  { canvas: [{ type: "line", x1: 30, y1: 0, x2: 170, y2: 0, lineWidth: 0.8 }], margin: [0, 2, 0, 4] },
                  { text: `( ${namaDekan} )`, alignment: "center", bold: true },
                ],
                width: "50%",
                alignment: "center",
              },
            ],
            margin: [0, 0, 0, 16],
          }
        ]
      },

      // ── Catatan Perhatian ──
      {
        text: "Catatan Perhatian :",
        bold: true,
        italics: true,
        decoration: "underline",
        fontSize: 8.5,
        margin: [0, 0, 0, 2],
      },
      {
        ol: [
          {
            text: "Bilamana batas waktu cuti akademik telah habis dan mahasiswa yang bersangkutan tidak mengajukan permohonan untuk kembali aktif mengikuti perkuliahan, maka semester atau tahun akademik berikutnya diperhitungkan dalam perhitungan masa studi dan mahasiswa dikenakan kewajiban membayar SPP penuh. Untuk kasus ini pejabat yang berwenang akan memberikan peringatan tertulis kepada mahasiswa yang bersangkutan.",
            fontSize: 8,
            margin: [0, 0, 0, 4],
          },
          {
            text: "Setelah diberikan peringatan tertulis oleh pejabat yang berwenang, mahasiswa yang dimaksud pada butir (1) di atas masih juga tidak mengajukan permohonan untuk kembali aktif mengikuti perkuliahan sampai dengan dua semester berikutnya, maka mahasiswa tersebut dinyatakan mengundurkan diri dan hilang haknya sebagai mahasiswa UIKA. Sangsi ini harus disebutkan dalam surat peringatan yang dimaksud butir (1) diatas.",
            fontSize: 8,
          },
        ],
      },
    ],
  };

  await writePdf(docDefinition, outputPath);
};

module.exports = {
  generateSuratPengunduranDiri,
  generateSuratCutiAkademik,
};
