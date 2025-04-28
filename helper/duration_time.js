// First, you need to import dayjs and its plugins at the top of your file
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');

// Add the required plugins
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Refactored function to combine date and time using dayjs
exports.combineDateTime = (dateStr, timeStr) => {
  // Create a dayjs object from the date string
  let date = dayjs(dateStr);
  
  // If time string is provided and valid, parse and set the time
  if (timeStr && typeof timeStr === 'string') {
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Only set hours and minutes if they are valid numbers
    if (!isNaN(hours) && !isNaN(minutes)) {
      date = date.hour(hours).minute(minutes).second(0);
    }
  }
  return date;
};

// Refactored function to calculate rental duration using dayjs
exports.calculateRentalDuration = (startDateTime, returnDateTime) => {
  // Convert to dayjs objects if they aren't already
  const start = dayjs(startDateTime);
  const end = dayjs(returnDateTime);
  
  // Check if start and end are on the same day
  if (start.format('YYYY-MM-DD') === end.format('YYYY-MM-DD')) {
    return 1; // Same day rentals count as 1 day
  }
  
  // Calculate days difference (without considering hours)
  const startDay = start.startOf('day');
  const endDay = end.startOf('day');
  
  // Get difference in days
  const daysDiff = endDay.diff(startDay, 'day');
  
  // Check if return time is same as pickup time
  if (start.format('HH:mm') === end.format('HH:mm')) {
    return daysDiff;
  }
  
  return daysDiff + 1;
};