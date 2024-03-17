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

function isoToDateId(dateTime) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

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

  const date = new Date(dateTime);
  const dayOfWeek = days[date.getDay()];
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);

  return {
    dayOfWeek,
    day,
    month,
    year,
    hours,
    minutes,
    seconds,
  };

  return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  formatDateToIndonesian,
  isoToDateId,
};
