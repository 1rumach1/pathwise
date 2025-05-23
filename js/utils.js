// Utility functions for date and time formatting

// Format date to display format (e.g., "May 16, 2025")
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Format time to display format (e.g., "9:00 AM")
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Check if date is today
export function isToday(date) {
  const today = new Date();
  const taskDate = new Date(date);
  
  return today.getDate() === taskDate.getDate() &&
         today.getMonth() === taskDate.getMonth() &&
         today.getFullYear() === taskDate.getFullYear();
}

// Check if date is in the future
export function isFuture(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  
  return taskDate > today;
}

// Check if date is in the past
export function isPast(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  
  return taskDate < today;
}

// Format date range (e.g., "May 16, 9:00 AM - 10:30 AM" or "May 16 - May 17")
export function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // If same day, show date once with time range
  if (start.getDate() === end.getDate() &&
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()) {
    
    return `${formatDate(start)}, ${formatTime(start)} - ${formatTime(end)}`;
  }
  
  // Different days, show full range
  return `${formatDate(start)} - ${formatDate(end)}`;
}

// Calculate duration between two dates in minutes
export function getDurationMinutes(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const diffMs = end - start;
  return Math.floor(diffMs / 60000); // Convert ms to minutes
}

// Format duration as hours and minutes
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
}