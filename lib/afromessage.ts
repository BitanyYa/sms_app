export async function sendSms(
  phone: string,
  message: string
) {
  try {
    const response = await fetch(
      "https://api.afromessage.com/api/send",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.AFROMESSAGE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.AFROMESSAGE_IDENTIFIER,
          sender: process.env.AFROMESSAGE_SENDER,
          to: phone,
          message,
        }),
      }
    );

        const responseText = await response.text();

    let data;

    try {
    data = JSON.parse(responseText);
    } catch {
    data = responseText;
    }

    // Debug: log the full AfroMessage response so issues are visible in server logs
    console.log("[AfroMessage] HTTP status:", response.status);
    console.log("[AfroMessage] Response body:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        response: JSON.stringify(data),
      };
    }

    // AfroMessage can return HTTP 200 but still include an error in the body
    // Check for an explicit error flag in the response
    const hasError =
      data?.acknowledge === "error" ||
      data?.response?.errors?.length > 0 ||
      data?.status === "error";

    if (hasError) {
      console.error("[AfroMessage] Provider returned an error:", JSON.stringify(data));
      return {
        success: false,
        messageId: null,
        response: JSON.stringify(data),
      };
    }

    return {
      success: true,
      messageId: data?.response?.message_id ?? data?.message_id ?? null,
      response: JSON.stringify(data),
    };

  } catch (error) {
    return {
      success: false,
      messageId: null,
      response:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
}