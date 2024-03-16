function formatDateToIndonesian(dateTime) {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const parts = dateTime.split(/[- :]/);
  const year = parts[0];
  const month = months[parseInt(parts[1], 10) - 1];
  const day = parts[2];
  const time = parts[3] + ":" + parts[4] + ":" + parts[5];

  // return `${day} ${month} ${year} ${time}`;
  return `${time}`;
}

module.exports = {
  formatDateToIndonesian,
};
