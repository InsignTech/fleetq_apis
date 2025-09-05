// utils/dateFormatter.js

export const formatDateTime = (dateInput) => {
  if (!dateInput) return "";

  const date = new Date(dateInput);

  if (isNaN(date)) return "";

  // Get day
  const day = String(date.getDate()).padStart(2, "0");

  // Get month in uppercase (JAN, FEB, etc.)
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();

  // Get year
  const year = date.getFullYear();

  // Format time in 12-hour format with AM/PM
  const time = date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).toUpperCase();

  // Final format => DD-MMM-YYYY HH:MM AM/PM
  return `${day}-${month}-${year} ${time}`;
};
