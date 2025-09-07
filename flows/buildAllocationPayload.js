import axios from "axios";

// utils/buildAllocationPayload.js
const apiUrl =
  "https://api.connectpanels.com/whatsapp-api/v1.0/customer/119041/bot/721911d2181a49af/template";

const WHATSAPP_AUTH = "e0c18806-0a56-4479-bdb7-995caa70793c-Ic2oMya";

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
            { type: "text", text: truckNumber }, // Param 1
            { type: "text", text: forwarderName }, // Param 2
            { type: "text", text: destination }, // Param 3
            { type: "text", text: amount }, // Param 4
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
            { type: "text", text: destination }, // Param 1
            { type: "text", text: rate }, // Param 2
            { type: "text", text: transporterCompanyName }, // Param 3
            { type: "text", text: truckNumber }, // Param 4
            {
              type: "text",
              text: `${contactPersonName} (${contactPersonNumber})`,
            }, // Param 5
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

export const sendTripBookingConfirmationPush = async ({
  tripId,
  type,
  position,
  destination,
  bookingTime,
  contactNumber,
}) => {
  try {
    // Build WhatsApp payload
    const payload = {
      payload: {
        name: "tripbookingconfirmationmessage",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: destination },
              { type: "text", text: type },
              { type: "text", text: position },
              { type: "text", text: bookingTime },
              { type: "text", text: tripId },
            ],
          },
          {
            index: 0,
            parameters: [
              {
                payload: `flow_0A62D2685BB94E17ADAD8B22EF0B7E01||data_trip_id=${tripId}`,
                type: "payload",
              },
            ],
            sub_type: "quick_reply",
            type: "button",
          },
        ],
        language: { code: "en_US", policy: "deterministic" },
        namespace: "29f53ec4_c8e3_4988_83fc_312d87b4bf8f",
      },
      phoneNumber: contactNumber,
    };

    // Send API Request
    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Basic ${WHATSAPP_AUTH}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ WhatsApp Trip Confirmation Sent:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(
      "❌ WhatsApp Trip Confirmation Failed:",
      error.response?.data || error.message
    );
    return { success: false, error: error.response?.data || error.message };
  }
};


export async function sendTruckNotificationForAllocationPayment(
  allocationId,
  amount,
  phoneNumber,
  destination,
  truckbookingId
) {
  try {
    console.log(destination)
    console.log(amount)
    console.log(truckbookingId),
    console.log(allocationId)
    
    const payload = {
      payload: {
        name: "transporterfeepaymentrequest", // WhatsApp template name
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: destination },
              { type: "text", text: String(amount) }, // Param 1 - Amount
              { type: "text", text: String(amount) }, // Param 2 - Same amount again
            ],
          },
          {
            index: 0,
            parameters: [
              {
                payload: `flow_45BF1DFEDA4E453087355A4F8C41CDD1||data_allocation_id=${allocationId}`,
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
                payload: `flow_60C3653535974B6AADA59CE5FB6B1692||data_Response.data.bookingId=${truckbookingId}`,
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

    console.log("🔹 Sending WhatsApp Notification Payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Basic ${WHATSAPP_AUTH}`,
        "Content-Type": "application/json",
      },
    });

    // Log response details
    console.log("✅ WhatsApp Notification Sent Successfully!");
    console.log("🔹 Status:", response.status);
    console.log("🔹 Response Data:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error("❌ Error Sending WhatsApp Notification");

    if (error.response) {
      console.error("🔹 Status:", error.response.status);
      console.error("🔹 Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("🔹 Error Message:", error.message);
    }

   // throw error; // Re-throw to handle it upstream if needed
  }
}