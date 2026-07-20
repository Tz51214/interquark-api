import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler'; // optional, see README note
import { SupportChatDto } from './dto/support-chat.dto';
import { SupportChatService } from './support-chat.service';

@Controller('support')
export class SupportChatController {
  constructor(private readonly supportChatService: SupportChatService) {}

  @Post('chat')
  @Throttle({ default: { limit: 15, ttl: 60_000 } }) // 15 req/min per IP — remove if you haven't installed @nestjs/throttler
  async chat(@Body() dto: SupportChatDto) {
    const reply = await this.supportChatService.reply(dto);
    return { reply };
  }
}
