import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscountCode, DiscountType } from './entities/discount-code.entity';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(DiscountCode) private readonly repo: Repository<DiscountCode>,
  ) {}

  create(dto: CreateDiscountDto) {
    const discount = this.repo.create({
      code: dto.code.toUpperCase().trim(),
      type: dto.type,
      value: dto.value,
      maxUses: dto.maxUses ?? null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    return this.repo.save(discount);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async remove(id: number) {
    const discount = await this.repo.findOne({ where: { id } });
    if (!discount) throw new NotFoundException('Discount code not found.');
    await this.repo.remove(discount);
    return { deleted: true };
  }

  async toggleActive(id: number) {
    const discount = await this.repo.findOne({ where: { id } });
    if (!discount) throw new NotFoundException('Discount code not found.');
    discount.active = !discount.active;
    return this.repo.save(discount);
  }

  // Validates a code and returns the actual discount amount to apply —
  // doesn't increment usedCount yet, since the order might not
  // actually complete (payment could fail/be abandoned).
  async validate(dto: ValidateDiscountDto) {
    const code = dto.code.toUpperCase().trim();
    const discount = await this.repo.findOne({ where: { code } });

    if (!discount) throw new BadRequestException('Invalid discount code.');
    if (!discount.active) throw new BadRequestException('This discount code is no longer active.');
    if (discount.expiresAt && discount.expiresAt < new Date()) {
      throw new BadRequestException('This discount code has expired.');
    }
    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      throw new BadRequestException('This discount code has reached its usage limit.');
    }

    const discountAmount =
      discount.type === DiscountType.PERCENTAGE
        ? (dto.orderTotal * Number(discount.value)) / 100
        : Math.min(Number(discount.value), dto.orderTotal);

    return {
      valid: true,
      code: discount.code,
      type: discount.type,
      value: Number(discount.value),
      discountAmount: Math.round(discountAmount * 100) / 100,
      newTotal: Math.round((dto.orderTotal - discountAmount) * 100) / 100,
    };
  }

  // Called once an order actually completes payment with this code.
  async redeem(code: string) {
    const discount = await this.repo.findOne({ where: { code: code.toUpperCase().trim() } });
    if (discount) {
      discount.usedCount += 1;
      await this.repo.save(discount);
    }
  }
}
