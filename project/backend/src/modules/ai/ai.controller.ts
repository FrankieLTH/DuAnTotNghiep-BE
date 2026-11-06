import { Controller, Post, Body } from '@nestjs/common';
import { AIService } from './ai.service';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('chat')
  async chat(@Body() body: { user_id?: number; session_id?: string; message: string }) {
    return this.aiService.processChat(body);
  }
}
