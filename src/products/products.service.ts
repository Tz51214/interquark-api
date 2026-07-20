import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
  ) {}

  create(dto: CreateProductDto) {
    const product = this.repo.create(dto);
    return this.repo.save(product);
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findActive() {
    return this.repo.find({ where: { active: true } });
  }

  async findOne(id: string) {
    const product = await this.repo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.repo.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.repo.remove(product);
    return { message: 'Product deleted' };
  }
}
