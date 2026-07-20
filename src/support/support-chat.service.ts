import { Injectable, BadGatewayException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { SupportChatDto } from './dto/support-chat.dto';

// Keep this in sync with whatever pricing/services actually appear on
// index.html. It's what stops the model from guessing or hallucinating.
const SYSTEM_PROMPT = `You are the Interquark support assistant, embedded as a chat widget on the Interquark website (a freelance/agency marketplace for web development services, run by Zahra Web Studio).

Answer visitor questions about services, pricing, and timelines using ONLY the facts below. If something isn't covered, say you're not sure and suggest using the contact form near the bottom of the page, or clicking "Join as freelancer" for freelancer signups.

SERVICES & PRICING:
- WordPress: brochure sites from $300, full stores from $600
- Shopify: standard theme from $800, fully custom theme from $1,400
- Magento 2 / Adobe Commerce: starter store from $2,500, full enterprise build from $6,000
- Security (Magecart/malware remediation): from $250, emergency 24-48hr response from $450
- Platform migrations with SEO preservation (301 redirects, URL mapping): from $350
- Payment gateway integration: single gateway from $200, multi-gateway with conditional rules from $450
- SaaS/ERP platform builds: single module from $5,000, full multi-tenant platform up to $12,000

TIMELINES: brochure sites ~1 week; full platform builds range from several weeks to a few months depending on scope.

TONE: friendly, concise, confident. Keep replies to 2-4 sentences unless the visitor asks for detail. Never invent prices or timelines beyond what's listed above.`;

@Injectable()
export class SupportChatService {
  private readonly client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  async reply(dto: SupportChatDto): Promise<string> {
    const history = (dto.history ?? []).slice(-10); // cap context sent per request

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user' as const, content: dto.message },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock && 'text' in textBlock
        ? textBlock.text
        : "Sorry, I couldn't put together a reply just now.";
   } catch (err) {
      console.error('SUPPORT CHAT ERROR:', err);
      throw new BadGatewayException(
        'The assistant is temporarily unavailable. Please try again shortly.',
      );
    }
  }
}
