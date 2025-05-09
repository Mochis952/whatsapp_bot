import { Injectable } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import * as qrcodeTerminal from 'qrcode-terminal'; // <-- agrega esta línea

@Injectable()
export class WhatsappBotService {
  private client: Client;
  private qrCodeData: string | null = null;
  private isReady = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    this.client.on('qr', (qr) => {
      console.log(qr);
      this.qrCodeData = qr; // Guardamos el string QR para mostrarlo por un endpoint
    });

    this.client.on('qr', (qr) => {
      this.qrCodeData = qr;
      qrcodeTerminal.generate(qr, { small: true }); // Muestra QR en consola
    });

    this.client.on('ready', () => {
      this.qrCodeData = null;
      this.isReady = true;
      console.log('✅ WhatsApp listo');
    });

    this.client.initialize();
  }

  async getQrCode(): Promise<string | null> {
    if (this.qrCodeData) {
      return await qrcode.toDataURL(this.qrCodeData);
    }
    return null; // Ya está autenticado
  }

  async sendMessage(number: string, message: string): Promise<string> {
    const chatId = `${number}@c.us`;

    try {
      await this.client.sendMessage(chatId, message);
      return `Mensaje enviado a ${number}`;
    } catch (error) {
      console.log(`Error al enviar mensaje: ${error.message}`);
      throw error;
    }
  }

  async sendMessageToGroup(groupName: string, message: string): Promise<string> {
    const chats = await this.client.getChats();
    console.log(chats);
    const group = chats.find(chat => chat.isGroup && chat.name === groupName);

    if (!group) {
      throw new Error(`Grupo "${groupName}" no encontrado`);
    }

    await this.client.sendMessage(group.id._serialized, message);
    console.log(`Mensaje enviado al grupo "${group.id._serialized}"`);
    return `Mensaje enviado al grupo "${groupName}"`;
  }

  isClientReady(): boolean {
    return this.isReady;
  }
}
