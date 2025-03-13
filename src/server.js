const app = require('./app');
const config = require('./config');
const prisma = require('./app/utils/prisma');

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('🗄️ Database connection successful');

    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to connect database:', error);
  }
}

bootstrap();
