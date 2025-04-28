const TIER_LEVEL = [0, 5, 10, 15, 20];

exports.tierCalculateDiscount = function (tier, price, servicePrice, discountAmount) {
  if (tier < 0 || tier > TIER_LEVEL.length - 1) {
    return 0;
  }

  if (discountAmount !== null || discountAmount !== undefined) {
    return discountAmount;
  } else {
    return ((price + servicePrice) * TIER_LEVEL[tier]) / 100 || 0;
  }
};
