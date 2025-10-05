import { Injectable } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia, Message } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
interface ChromiumTestResult {
  success: boolean;
  message: string;
  browserVersion?: string;
  pageTitle?: string;
  error?: {
    message: string;
    stack?: string;
    details?: string;
  };
}

export interface FormattedMessage {
  from: string;
  to: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
}

@Injectable()
export class WhatsappBotService {
  private client: Client | null = null;
  private isInitialized = false;
  private pendingQr: string | null = null;

  constructor() {
    this.setupClient();
  }

  private setupClient() {
    console.log('Iniciando WhatsApp...');
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        // executablePath: '/home/ec2-user/api-partners/node_modules/puppeteer-core/.local-chromium/linux-1045629/chrome-linux/chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    this.client.on('qr', (qr: string) => {
      console.log('🔐 Escanea este QR:');
      qrcode.generate(qr, { small: true });
      this.pendingQr = qr;
    });

    this.client.on('ready', () => {
      console.log('Cliente de WhatsApp listo');
      this.isInitialized = true;
      this.pendingQr = null;
    });

    this.client.on('auth_failure', (msg) => {
      console.error('Fallo de autenticación:', msg);
    });

    this.client.on('authenticated', () => {
      console.log('✅ Autenticado');
    });

    this.client.on('disconnected', (reason) => {
      console.error('⚠️ Cliente desconectado:', reason);
    });

    this.client.on('loading_screen', (percent, message) => {
      console.log(`⏳ Cargando... ${percent}% - ${message}`);
    });

    this.client.on('change_state', (state) => {
      console.log(`📶 Estado cambiado: ${state}`);
    });
    this.client.on('message',  (msg) => {
      // this.detectorMessage(msg);
    });
  }

  async startSession(): Promise<{ status: string; qr?: string }> {
    console.log('startSession');
    if (this.isInitialized) {
      return { status: 'La sesión ya está activa' };
    }

    if (!this.client) {
      this.setupClient();
    }

    try {
      await this.client.initialize();
    } catch (err) {
      console.error('[WhatsappBot] Error al inicializar:', err);
    }
    return new Promise((resolve) => {
      const checkQR = setInterval(() => {
        if (this.pendingQr) {
          clearInterval(checkQR);
          resolve({ status: 'Qr generado' });
        } else if (this.isInitialized) {
          clearInterval(checkQR);
          resolve({ status: 'La sesión ya fue iniciada' });
        }
      }, 500);
    });
  }

  async sendMessage(to: string, message: string): Promise<string> {
    if (!this.client || !this.isInitialized) {
      const start = await this.startSession();
      if (start.status == 'Qr generado') {
        return `El cliente de WhatsApp no está listo, scanea el QR para continuar"`;
      }
    }
    if (!to.endsWith('@c.us')) {
      to = `${to}@c.us`;
    }

    await this.client.sendMessage(to, message);
  }
  async sendMessageToGroup(groupId: string, message: string, imagePathOrUrl?: string[]): Promise<string> {
    if (!this.client || !this.isInitialized) {
      const start = await this.startSession();
      if (start.status == 'Qr generado') {
        return `El cliente de WhatsApp no está listo, scanea el QR para continuar"`;
      }
    }

    const chats = await this.client.getChats();
    const group = chats.find(chat => chat.isGroup && chat.id._serialized === groupId);
    

    await this.client.sendMessage(groupId, message);
    if (imagePathOrUrl) {
      for (const imageData of imagePathOrUrl) {
        let media: MessageMedia;
    
        if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
          console.log('Enviando desde URL:', imageData);
          media = await MessageMedia.fromUrl(imageData, { unsafeMime: true });
    
        } else if (imageData.startsWith('data:image')) {
          console.log('Enviando desde Data URL (Base64)...');

          const match = imageData.match(/^data:(.+);base64,(.+)$/);

          if (!match) {
            throw new Error('El formato del Data URL de la imagen no es válido.');
          }

          const mimeType = match[1]; 
          const base64Data = match[2];
          
          media = new MessageMedia(mimeType, base64Data, 'imagen.png');
          
        } else {
          console.log('Enviando desde ruta de archivo:', imageData);
          if (!fs.existsSync(imageData)) {
            throw new Error(`El archivo de imagen local no existe: ${imageData}`);
          }
          media = MessageMedia.fromFilePath(imageData);
        }
        await this.client.sendMessage(groupId, media);
      }
    }
    return `Mensaje enviado al grupo "${groupId}"`;
  }
  async get_grups(): Promise<any[]> {
    if (!this.client || !this.isInitialized) {
      const start = await this.startSession();
      if (start.status == 'Qr generado') {
        throw new Error('El cliente de WhatsApp no está listo.');
      }
    }

    const chats = await this.client.getChats();
    return chats;
  }

  async getChatHistory(phoneNumber: string): Promise<FormattedMessage[]> {
    if (!this.client || !this.isInitialized) {
      const start = await this.startSession();
      if (start.status == 'Qr generado') {
        throw new Error('El cliente de WhatsApp no está listo.');
      }
    }

    if (!phoneNumber.endsWith('@c.us')) {
      phoneNumber = `${phoneNumber}@c.us`;
    }

    const chat = await this.client.getChatById(phoneNumber);
    if (!chat) {
      throw new Error('No se encontró el chat.');
    }

    const messages = await chat.fetchMessages({ limit: 20 });

    const formattedMessages = messages.map((message) => ({
      from: message.from,
      to: message.to,
      body: message.body,
      timestamp: message.timestamp,
      fromMe: message.fromMe,
    }));

    return formattedMessages;
  }
  async testPuppeteer(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Test] Iniciando Puppeteer...');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      await browser.close();
      console.log('[Test] ✅ Puppeteer funciona correctamente');
      const path = puppeteer.executablePath();
      console.log('✅ Puppeteer está usando este navegador Chromium:');
      console.log(path);
      return { success: true, message: 'Puppeteer funciona correctamente' };
    } catch (error) {
      console.error('[Test] ❌ Puppeteer falló:', error);
      return { success: false, message: error.message };
    }
  }
  async testChromiumLaunch(): Promise<ChromiumTestResult> {
    console.log('INFO: Iniciando prueba de lanzamiento de Chromium...');
    let browser: puppeteer.Browser | null = null;
    const result: ChromiumTestResult = {
      success: false,
      message: '',
    };

    try {
      const launchOptions: puppeteer.PuppeteerLaunchOptions = {
        headless: true, // O 'new' para el nuevo modo headless
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
        // Descomenta y ajusta si usas un Chrome/Chromium del sistema:
        // executablePath: '/usr/bin/google-chrome-stable',
      };

      console.log(
        'INFO: Usando las siguientes opciones de lanzamiento para Puppeteer:',
      );
      console.log(JSON.stringify(launchOptions, null, 2));

      browser = await puppeteer.launch(launchOptions);
      result.message =
        '¡ÉXITO! Puppeteer se ha iniciado correctamente y ha abierto Chromium.';
      console.log(result.message);

      result.browserVersion = await browser.version();
      console.log(`INFO: Versión del navegador: ${result.browserVersion}`);

      console.log('INFO: Intentando abrir una nueva página...');
      const page = await browser.newPage();
      console.log('INFO: Navegando a https://miempeno.com...');
      await page.goto('https://miempeno.com', { waitUntil: 'networkidle2' });
      result.pageTitle = await page.title();
      result.message += ` Página cargada. Título: "${result.pageTitle}"`;
      console.log(`¡ÉXITO! Página cargada. Título: "${result.pageTitle}"`);
      await page.close();
      console.log('INFO: Página cerrada.');
      result.success = true;

    } catch (error) {
      console.error(
        'ERROR AL INTENTAR INICIAR CHROMIUM CON PUPPETEER:',
        error.stack,
      );
      result.success = false;
      result.message = 'Fallo al iniciar Chromium con Puppeteer.';
      result.error = {
        message: error.message,
        stack: error.stack,
      };

      if (error.message.includes('Failed to launch the browser process')) {
        result.error.details =
          'POSIBLE CAUSA: Faltan dependencias del sistema para Chromium en tu servidor Linux. Consulta la documentación de Puppeteer sobre "Troubleshooting".';
        console.error(result.error.details);
      } else if (error.message.includes('Could not find expected browser')) {
        result.error.details =
          'POSIBLE CAUSA: Puppeteer no pudo encontrar el ejecutable de Chromium. Asegúrate de que `puppeteer` (paquete completo) esté instalado, o que `executablePath` sea correcto, y que `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` no esté en true (a menos que se proporcione un executablePath válido).';
        console.error(result.error.details);
      }
    } finally {
      if (browser) {
        console.log('INFO: Cerrando el navegador...');
        await browser.close();
        console.log('INFO: Navegador cerrado.');
      }
    }
    return result;
  }
  /**
   * @description El objeto "_data" tiene la propiedad remote que es el grupo o id del chat, para detectar de donde proviene el mensaje
   * @param msg Mensaje [objeto]
   */
}