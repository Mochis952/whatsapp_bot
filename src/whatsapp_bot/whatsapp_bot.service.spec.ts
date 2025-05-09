import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappBotService } from './whatsapp_bot.service';

describe('WhatsappBotService', () => {
  let service: WhatsappBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhatsappBotService],
    }).compile();

    service = module.get<WhatsappBotService>(WhatsappBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
