const {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
  endOfDay,
} = require("date-fns");

const generatePeriods = (startDate, endDate, periodType) => {
  let periods = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    switch (periodType) {
      case "daily":
        periods.push({ period: format(current, "yyyy-MM-dd") });
        current.setDate(current.getDate() + 1);
        break;
      case "weekly":
        periods.push({
          period: `Week ${Math.ceil(
            current.getDate() / 7
          )} ${current.getFullYear()}`,
          startDate: startOfWeek(current),
          endDate: endOfWeek(current),
        });
        current.setDate(current.getDate() + 7);
        break;
      case "monthly":
        periods.push({
          period: `${current.getMonth() + 1}/${current.getFullYear()}`,
        });
        current.setMonth(current.getMonth() + 1);
        break;
      case "yearly":
        periods.push({ period: `${current.getFullYear()}` });
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        break;
    }
  }

  return periods;
};

module.exports = {
  generatePeriods,
};
