const TelegramBot = require('node-telegram-bot-api');

// Replace with your bot's token
const token = '8151038148:AAF6GGH1lp8XhjkyrmaKApo6cRdzTA5lDLo';

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Chat ID where you want to send the message
const chatId = '1520159611';

// Message to send
const message = 'Hello, this is a message from my Telegram bot!';

function sendMessage(chatId, message){
    // Send the message
    bot.sendMessage(chatId, message)
    .then(() => {
        // console.log('Message sent successfully');
    })
    .catch((error) => {
        console.error('Error sending message:', error);
    });

}

// Listen for all messages
bot.on('message', (msg) => {
  console.log('Received message:', msg);
  const chatId = msg.chat.id;

  // Respond to the message
  bot.sendMessage(chatId, 'Hello! I received your message.');
});
