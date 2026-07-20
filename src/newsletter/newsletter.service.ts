import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterSubscriber)
    private readonly repo: Repository<NewsletterSubscriber>,
  ) {}

  async subscribe(dto: SubscribeDto) {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('This email is already subscribed.');
    }
    const subscriber = this.repo.create({ email: dto.email });
    await this.repo.save(subscriber);
    return { message: 'Subscribed successfully.' };
  }

  findAll() {
    return this.repo.find({ order: { subscribedAt: 'DESC' } });
  }
}
