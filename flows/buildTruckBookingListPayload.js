export function buildTruckBookingListPayload(truckNumber, phoneNumber) {
  return {
    payload: {
      name: "available_trucks",
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: truckNumber, 
            },
          ],
        },
        {
          index: 0,
          parameters: [
            {
              payload: `flow_4360136BA7F84081869DEEEE0D3722B2||data_truck_number=${truckNumber}`, 
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

