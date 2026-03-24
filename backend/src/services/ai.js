const axios = require('axios');

const AI_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';

const detect = async (imageBase64) => {
  const response = await axios.post(`${AI_URL}/detect`, { image: imageBase64 });
  return response.data;
};

module.exports = { detect };
