const _ = require("lodash");

const CastObject = ({ Model, body }) => {
  let filter = {};
  let attr = Model.getAttributes();
  _.forEach(body, (val, key) => {
    if (attr[key]) {
      filter[key] = val;
    }
  });
  return filter;
};

module.exports = {
  CastObject,
};
