exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  let incomingData;
  try {
    incomingData = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid JSON format" }) };
  }

  // --- 1. BACKEND DATA VALIDATION ---
  
  // Define strict rules (Regex & Allowed Lists)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRe = /^[a-zA-Z\s\-']+$/;       
  const phoneRe = /^[\d+\-()\s]+$/;        
  const allowedServices = ["Portraits", "Landscape", "Events", "Motorsport", "Multiple/Unsure"];
  
  // Whitelist the optional dropdowns (including an empty string if they leave it blank)
  const allowedBudgets = ["Under $500", "$500-$1000", "$1000-$2500", "$2500-$5000", "$5000+", "Let's discuss", ""];
  const allowedSources = ["Instagram", "Referral", "Google", "Portfolio Event", "Other", ""];
  
  // Extract and sanitize inputs
  const fname = incomingData["First Name"]?.trim() || "";
  const lname = incomingData["Last Name"]?.trim() || "";
  const email = incomingData["Email"]?.trim() || "";
  const phone = incomingData["Phone Number"]?.trim() || "";
  const service = incomingData["Service Type"] || "";
  const preferredDate = incomingData["Preferred Date"] || "";
  const budget = incomingData["Budget Range"] || "";
  const source = incomingData["Referral Source"] || "";
  const message = incomingData["Message"]?.trim() || "";

  const sendError = (msg) => ({ statusCode: 400, body: JSON.stringify({ message: msg }) });

  // Validate Names
  if (!fname || fname.length > 50 || !nameRe.test(fname)) return sendError("Invalid First Name. Please use only letters.");
  if (!lname || lname.length > 50 || !nameRe.test(lname)) return sendError("Invalid Last Name. Please use only letters.");

  // Validate Phone (Only if provided)
  if (phone && (phone.length > 20 || !phoneRe.test(phone))) return sendError("Invalid Phone Number. Please check your formatting.");

  // NEW: Validate Future Date (Only if provided)
  if (preferredDate) {
    // Attempt to parse the incoming date
    const parsedIncomingDate = new Date(preferredDate);
    
    // Get today's local date and reset the time to midnight for a clean comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If the parsed date is invalid, or if it is less than or equal to today, reject it
    if (isNaN(parsedIncomingDate.getTime()) || parsedIncomingDate <= today) {
      return sendError("Invalid Date. Please select a valid date in the future.");
    }
  }

  // Validate Dropdowns
  if (!allowedServices.includes(service)) return sendError("Invalid Service Type.");
  if (!allowedBudgets.includes(budget)) return sendError("Invalid Budget Range.");
  if (!allowedSources.includes(source)) return sendError("Invalid Referral Source.");

  // Validate Email and Message
  if (!email || email.length > 150 || !emailRe.test(email)) return sendError("Invalid Email.");
  if (!message || message.length > 3000) return sendError("Message is required and must be under 3000 characters.");


  // --- 2. FORWARD TO WEB3FORMS ---
  
  // Construct the secure payload
  const web3FormsPayload = {
    access_key: process.env.WEB3FORMS_API_KEY,
    "First Name": fname,
    "Last Name": lname,
    Email: email,
    "Phone Number": phone,
    "Service Type": service,
    "Preferred Date": preferredDate,
    Location: incomingData["Location"]?.trim().substring(0, 100) || "", // Substrings enforce max length
    "Budget Range": budget,
    "Referral Source": source,
    Message: message,
    subject: "New Portfolio Inquiry from Eyes of Sai",
    
    // CRITICAL: Pass the Anti-Spam fields to Web3Forms
    botcheck: incomingData.botcheck || false,
    "h-captcha-response": incomingData["h-captcha-response"] || ""
  };

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(web3FormsPayload)
    });

    const result = await response.json();
    
    return {
      statusCode: response.status,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Web3Forms API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};