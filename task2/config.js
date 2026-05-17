require('dotenv').config();

module.exports = {
    baseURL: process.env.WHEATLEY_BASE_URL,
    auth: {
        username: process.env.WHEATLEY_USERNAME,
        password: process.env.WHEATLEY_PASSWORD,
    },
};