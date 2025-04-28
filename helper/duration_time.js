exports.combineDateTime = (dateStr, timeStr) => {
  const date = new Date(dateStr);
  
  // If time string is provided and valid
  if (timeStr && typeof timeStr === 'string') {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Only set hours and minutes if they are valid numbers
    if (!isNaN(hours) && !isNaN(minutes)) {
      date.setHours(hours);
      date.setMinutes(minutes);
    }
  }
  
  return date;
};

exports.calculateRentalDuration = (startDateTime, returnDateTime, pickupTime, returnTime) => {
  const start = new Date(startDateTime);
  const end = new Date(returnDateTime);
  
  // If pickup and return times are provided separately, apply them
  if (pickupTime && typeof pickupTime === 'string') {
    const [pickupHours, pickupMinutes] = pickupTime.split(':').map(Number);
    if (!isNaN(pickupHours) && !isNaN(pickupMinutes)) {
      start.setHours(pickupHours, pickupMinutes, 0, 0);
    }
  }
  
  if (returnTime && typeof returnTime === 'string') {
    const [returnHours, returnMinutes] = returnTime.split(':').map(Number);
    if (!isNaN(returnHours) && !isNaN(returnMinutes)) {
      end.setHours(returnHours, returnMinutes, 0, 0);
    }
  }
  
  // Check if start and end are on the same day
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    return 1; // Same day rentals count as 1 day
  }
  
  // Calculate days difference (without time consideration)
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  
  // Get difference in days
  const daysDiff = Math.round((endDay - startDay) / (1000 * 60 * 60 * 24));
  
  // Check if return time is earlier than or exactly the same as pickup time
  if (
    end.getHours() < start.getHours() ||
    (end.getHours() === start.getHours() && end.getMinutes() <= start.getMinutes())
  ) {
    return daysDiff; // Return time is earlier or the same as pickup time
  }
  
  // Return time is later than pickup time
  return daysDiff + 1;
};
