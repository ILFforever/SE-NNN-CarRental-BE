exports.validateRateProvider = function (rateProvider) {
  if (!rateProvider || ![1, 2, 3, 4, 5].includes(rateProvider)) {
    return false;
  }
  return true;
};
