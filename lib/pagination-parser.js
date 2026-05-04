const getPagination = (size, page) => {
  let limit = size ? +size : 10;
  let offset = page ? (Number(page) - 1) * limit : 1;

  return { limit, offset };
};

const getPagingData = (count, limit) => {
  let totalItems = count;
  let totalPages = Math.ceil(Number(totalItems) / Number(limit));

  return { totalItems, totalPages };
};

module.exports = { getPagination, getPagingData };
