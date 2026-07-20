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

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        response: JSON.stringify(data),
      };
    }

    return {
      success: true,
      messageId: data?.message_id ?? null,
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