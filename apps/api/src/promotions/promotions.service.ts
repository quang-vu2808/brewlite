import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PromotionEntity } from './promotion.entity';
import { SavePromotionDto } from './promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findAvailable() {
    const now = new Date();
    const promotions = await this.dataSource.manager.find(PromotionEntity, {
      where: { isActive: true },
      order: { code: 'ASC' },
    });
    return promotions
      .filter((promotion) =>
        (!promotion.startsAt || promotion.startsAt <= now) &&
        (!promotion.endsAt || promotion.endsAt > now) &&
        (promotion.usageLimit === null || promotion.usageCount < promotion.usageLimit),
      )
      .map((promotion) => this.toResponse(promotion));
  }

  async findAllForStaff() {
    const promotions = await this.dataSource.manager.find(PromotionEntity, {
      order: { code: 'ASC' },
    });
    return promotions.map((promotion) => this.toResponse(promotion));
  }

  async create(dto: SavePromotionDto) {
    const values = this.normalize(dto);
    if (!values.code || !values.discountType || values.value === undefined) {
      throw new BadRequestException('Mã, loại giảm giá và giá trị là bắt buộc');
    }
    this.validatePromotion(values);
    const promotion = this.dataSource.manager.create(PromotionEntity, {
      ...values,
      usageCount: 0,
    });
    try {
      return this.toResponse(await this.dataSource.manager.save(promotion));
    } catch (error) {
      if (this.isDuplicateCode(error)) throw new ConflictException('Mã khuyến mãi đã tồn tại');
      throw error;
    }
  }

  async update(code: string, dto: SavePromotionDto) {
    return this.dataSource.transaction(async (manager) => {
      const promotion = await manager.findOne(PromotionEntity, {
        where: { code },
        lock: { mode: 'pessimistic_write' },
      });
      if (!promotion) throw new NotFoundException('Không tìm thấy mã khuyến mãi');
      if (dto.code && dto.code.toUpperCase() !== promotion.code) {
        throw new BadRequestException('Không thể thay đổi mã của khuyến mãi đã tạo');
      }
      Object.assign(promotion, this.normalize(dto));
      this.validatePromotion(promotion);
      if (promotion.usageLimit !== null && promotion.usageLimit < promotion.usageCount) {
        throw new BadRequestException('Giới hạn lượt dùng không thể thấp hơn số lượt đã dùng');
      }
      return this.toResponse(await manager.save(PromotionEntity, promotion));
    });
  }

  async deactivate(code: string) {
    return this.update(code, { isActive: false });
  }

  private normalize(dto: SavePromotionDto): Partial<PromotionEntity> {
    return {
      ...(dto.code !== undefined ? { code: dto.code.toUpperCase() } : {}),
      ...(dto.discountType !== undefined ? { discountType: dto.discountType } : {}),
      ...(dto.value !== undefined ? { value: dto.value } : {}),
      ...(dto.minimumAmount !== undefined ? { minimumAmount: dto.minimumAmount } : {}),
      ...(dto.maximumDiscount !== undefined ? { maximumDiscount: dto.maximumDiscount } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
      ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
    };
  }

  private validatePromotion(promotion: Partial<PromotionEntity>) {
    if (promotion.discountType === 'PERCENT' && (promotion.value ?? 0) > 100) {
      throw new BadRequestException('Phần trăm giảm giá không thể lớn hơn 100');
    }
    if (
      promotion.startsAt && promotion.endsAt &&
      promotion.endsAt <= promotion.startsAt
    ) {
      throw new BadRequestException('Thời điểm kết thúc phải sau thời điểm bắt đầu');
    }
  }

  private toResponse(promotion: PromotionEntity) {
    return {
      code: promotion.code,
      discountType: promotion.discountType,
      value: promotion.value,
      minimumAmount: promotion.minimumAmount,
      maximumDiscount: promotion.maximumDiscount,
      isActive: promotion.isActive,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      usageLimit: promotion.usageLimit,
      usageCount: promotion.usageCount,
    };
  }

  private isDuplicateCode(error: unknown) {
    if (typeof error !== 'object' || error === null || !('driverError' in error)) return false;
    const driverError = error.driverError;
    return typeof driverError === 'object' && driverError !== null &&
      'code' in driverError && driverError.code === '23505';
  }
}
