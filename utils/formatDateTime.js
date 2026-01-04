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

// Returns format: DD MM YYYY HH:mm (24-hour)
export const formatDateTime24 = (dateInput) => {
  if (!dateInput) return "";

  const date = new Date(dateInput);
  if (isNaN(date)) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} ${hours}:${minutes}`;
};
