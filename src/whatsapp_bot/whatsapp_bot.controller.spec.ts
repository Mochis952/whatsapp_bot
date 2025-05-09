import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappBotController } from './whatsapp_bot.controller';

describe('WhatsappBotController', () => {
  let controller: WhatsappBotController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappBotController],
    }).compile();

    controller = module.get<WhatsappBotController>(WhatsappBotController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
