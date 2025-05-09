import { Body, Controller, Get, Post } from '@nestjs/common';
import { WhatsappBotService } from './whatsapp_bot.service';

@Controller('whatsapp')
export class WhatsappBotController {
  constructor(private readonly whatsappService: WhatsappBotService) {}

  @Get('auth/qr')
  async getQrCode() {
    const qrImage = await this.whatsappService.getQrCode();
    if (!qrImage) {
      return {
        message: 'Ya estás autenticado 📱',
      };
    }
    return {
      qr: qrImage,
    };
  }
  @Post('send')
  async sendMessage(
    @Body() body: { number: string; message: string },
  ): Promise<string> {
    const { number, message } = body;
    return this.whatsappService.sendMessage(number, message);
  }

  @Post('send/grup')
  async sendMessageToGroup(
    @Body() body: { groupName: string; message: string },
  ): Promise<string> {
    const { groupName, message } = body;
    return this.whatsappService.sendMessageToGroup(groupName, message);
  }
}
