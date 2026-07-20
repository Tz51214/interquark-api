import { Injectable } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async create(dto: CreateContactDto) {
    await this.emailService.sendContactNotification(dto.name, dto.email, dto.message);
    return { message: 'Thanks — we\'ll be in touch shortly.' };
  }
}
