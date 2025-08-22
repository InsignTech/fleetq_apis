// statusEnum.js
export const STATUS = {
  INQUEUE: "inqueue",
  INPROGRESS: "inprogress",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  ALLOCATED: "allocated",
  CANCELLED: "cancelled",
  AUTOCANCELLED: "autoCancelled"
};

export const statusValues = Object.values(STATUS);
