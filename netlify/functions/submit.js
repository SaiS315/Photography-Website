exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse the data sent from your contact.html page
  const formData = JSON.parse(event.body);

  // Secretly attach your API key from the environment variables
  formData.access_key = process.env.WEB3FORMS_API_KEY;

  try {
    // Forward the data to Web3Forms
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    return {
      statusCode: response.status,
      body: JSON.stringify(result)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server Error" })
    };
  }
};