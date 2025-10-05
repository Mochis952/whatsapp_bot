import { Controller, Post, Body } from '@nestjs/common';
import { WhatsappBotService } from './whatsapp_bot.service';

@Controller('whatsapp')
export class WhatsappBotController {
  constructor(private readonly whatsappService: WhatsappBotService) {}

  @Post('start-session')
  async startSession() {
    console.log('Iniciando sesión de WhatsApp...');
    return await this.whatsappService.startSession();
  }

  @Post('send')
  async sendMessage(
    @Body('to') to: string,
    @Body('message') message: string,
  ) {
    await this.whatsappService.sendMessage(to, message);
  }

  @Post('send-group')
  async sendMessageToGroup(
    @Body('groupId') groupId: string,
    @Body('message') message: string,
    @Body('imagePathOrUrl') imagePathOrUrl?: string[],
  ) {
  const response = await this.whatsappService.sendMessageToGroup(groupId, message, imagePathOrUrl);
    return { status: response };
  }

  @Post('get-groups')
  async getGroups() {
    const groups = await this.whatsappService.get_grups();
    return { groups };
  }

  @Post('get-chat-history')
  async getChatHistory(@Body('phoneNumber') phoneNumber: string) {
    const messages = await this.whatsappService.getChatHistory(phoneNumber);
    return { messages };
  }
}