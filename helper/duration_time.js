exports.calculateRentalDuration = (startDate, returnDate) => {
  const start = new Date(startDate).toISOString();
  const end = new Date(returnDate).toISOString();

  const duration =
    Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;

  return duration;
};
