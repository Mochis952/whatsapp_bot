import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappBotController } from './whatsapp_bot/whatsapp_bot.controller';
import { WhatsappBotService } from './whatsapp_bot/whatsapp_bot.service';

@Module({
  imports: [],
  controllers: [AppController, WhatsappBotController],
  providers: [AppService, WhatsappBotService],
})
export class AppModule {}
