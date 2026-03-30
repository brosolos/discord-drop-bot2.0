require('dotenv').config();

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    console.error('❌ Missing TOKEN or CLIENT_ID in environment variables');
    process.exit(1);
}

module.exports = {
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID || null,
    defaultDropTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '600000'),
    maxAttemptsPerUser: parseInt(process.env.MAX_ATTEMPTS || '3')
};
