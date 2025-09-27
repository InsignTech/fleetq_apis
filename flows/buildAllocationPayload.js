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


export async function sendTruckNotificationForAllocation(
  truckDetails,    
  forwarder,      
  destination,    
  tripRate,    
  truckBookingId,
  phoneNumber,
  type,
  contactName,
  contactNumber
) {
  try {
    const payload = {
      payload: {
        name: "truck_allocation_message", 
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: truckDetails },        // {{1}} Truck Details
             { type: "text", text: type }, 
              { type: "text", text: forwarder },           // {{2}} Forwarder/Shipper
              { type: "text", text: destination },         // {{3}} Destination
              { type: "text", text: String(tripRate) },    // {{4}} Trip Rate
              { type: "text", text: contactName },
              { type: "text", text: contactNumber },        // {{5}} Contact Person
            ],
          },
          
           {
            index: 0,
            parameters: [
              {
                payload: `flow_60C3653535974B6AADA59CE5FB6B1692||data_truck_booking_id=${truckBookingId}`,
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

    console.log("🔹 Sending Truck Allocation WhatsApp Payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Basic ${WHATSAPP_AUTH}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Allocation Notification Sent Successfully!");
    console.log("🔹 Status:", response.status);
    console.log("🔹 Response Data:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error("❌ Error Sending Allocation Notification");

    if (error.response) {
      console.error("🔹 Status:", error.response.status);
      console.error("🔹 Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("🔹 Error Message:", error.message);
    }
  }
}



export async function sendTripAllocationNotification(
  destination ,       // e.g. "Bangalore Warehouse"
  tripRate,          // e.g. 12000
  transporter ,       // e.g. "ABC Logistics"
  truckDetails ,      // e.g. "KA-09-7788"
  truckType ,         // e.g. "14W Truck"
  contactName ,       // e.g. "Ramesh Kumar"
  contactPhone ,      // e.g. "9876543210"
  tripId,
  phoneNumber 
) {
  console.log(phoneNumber)
  try {
    const payload = {
      payload: {
        name: "trip_allocation_message_1",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: destination },            // {{1}}
              { type: "text", text: String(tripRate) },       // {{2}}
              { type: "text", text: transporter },            // {{3}}
              { type: "text", text: truckDetails },           // {{4}}
              { type: "text", text: truckType },              // {{5}}
              { type: "text", text: contactName },            // {{6}}
              { type: "text", text: contactPhone },           // {{7}}
            ],
          },
        
          {
            index: 0,
            parameters: [
              {
                payload: `flow_0A62D2685BB94E17ADAD8B22EF0B7E01||data_trip_Id=${tripId}`,
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

    console.log("🔹 Sending Trip WhatsApp Payload:", JSON.stringify(payload, null, 2));

    const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Basic ${WHATSAPP_AUTH}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Trip Notification Sent Successfully!");
    console.log("🔹 Status:", response.status);
    console.log("🔹 Response Data:", JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error("❌ Error Sending Trip Notification");

    if (error.response) {
      console.error("🔹 Status:", error.response.status);
      console.error("🔹 Error Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("🔹 Error Message:", error.message);
    }
  }
}



export const sendTruckCancellationNotification = async (
  phoneNumber,
  registrationNumber,
  type,
  queuePosition,
  truckBookingId,
  bookingTime
) => {
  try {
    const payload = {
      payload: {
        name: "truck_allotment_cancellation_message",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: registrationNumber }, // 1
              { type: "text", text: String(type) },        // 2
              { type: "text", text: String(queuePosition) }, // 3
              { type: "text", text: truckBookingId },      // 4
              { type: "text", text: bookingTime },         // 5
            ],
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

     const response = await axios.post(apiUrl, payload, {
      headers: {
        Authorization: `Basic ${WHATSAPP_AUTH}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Truck cancellation notification sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Failed to send truck cancellation notification:", error);
    throw error;
  }
};
