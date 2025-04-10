const axios = require('axios');
require('dotenv').config();

const getAccessToken = async () => {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${auth}` }
        });
        console.log("Access Token:", response.data.access_token);
    } catch (error) {
        console.error("Error fetching access token:", error.response?.data || error.message);
    }
};

getAccessToken();
