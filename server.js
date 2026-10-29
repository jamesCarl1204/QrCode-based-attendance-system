const env = require('./config/env'); // loads .env first
const app = require('./app');
const { startSessionEndJob } = require('./services/notificationJob');

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));

app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

startSessionEndJob();
