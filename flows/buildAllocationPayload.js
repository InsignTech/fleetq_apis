// utils/buildAllocationPayload.js

// Truck-side allocation message payload builder
export function buildTruckAllocationPayload(
  truckNumber,
  forwarderName,
  destination,
  amount,
  tripContactName,
  tripContactNumber,
  phoneNumber
) {
  return {
    payload: {
      name: "allocation_message",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: truckNumber },       // Param 1
            { type: "text", text: forwarderName },     // Param 2
            { type: "text", text: destination },      // Param 3
            { type: "text", text: amount },           // Param 4
            { type: "text", text: `${tripContactName} (${tripContactNumber})` }, // Param 5
          ],
        },
        {
          index: 0,
          parameters: [
            {
              payload: `flow_TRUCK_ALLOCATION||truck=${truckNumber}`, // You can customize flow ID
              type: "payload",
            },
          ],
          sub_type: "quick_reply",
          type: "button",
        },
        {
          index: 1,
          parameters: [
            {
              payload: `flow_TRUCK_ALLOCATION_REJECT||truck=${truckNumber}`, // For reject path
              type: "payload",
            },
          ],
          sub_type: "quick_reply",
          type: "button",
        },
      ],
      language: {
        code: "en_US",
        policy: "deterministic",
      },
      namespace: "29f53ec4_c8e3_4988_83fc_312d87b4bf8f",
    },
    phoneNumber: phoneNumber,
  };
}

// Trip-side allocation message payload builder
export function buildTripAllocationPayload(
  destination,
  rate,
  transporterCompanyName,
  truckNumber,
  type,
  contactPersonName,
  contactPersonNumber,
  phoneNumber
) {
  return {
    payload: {
      name: "allocation_message",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: destination },            // Param 1
            { type: "text", text: rate },                  // Param 2
            { type: "text", text: transporterCompanyName }, // Param 3
            { type: "text", text: truckNumber },           // Param 4
            { type: "text", text: `${contactPersonName} (${contactPersonNumber})` }, // Param 5
          ],
        },
        {
          index: 0,
          parameters: [
            {
              payload: `flow_TRIP_ALLOCATION||truck=${truckNumber}`, // Flow for accept
              type: "payload",
            },
          ],
          sub_type: "quick_reply",
          type: "button",
        },
        {
          index: 1,
          parameters: [
            {
              payload: `flow_TRIP_ALLOCATION_REJECT||truck=${truckNumber}`, // Flow for reject
              type: "payload",
            },
          ],
          sub_type: "quick_reply",
          type: "button",
        },
      ],
      language: {
        code: "en_US",
        policy: "deterministic",
      },
      namespace: "29f53ec4_c8e3_4988_83fc_312d87b4bf8f",
    },
    phoneNumber: phoneNumber,
  };
}
