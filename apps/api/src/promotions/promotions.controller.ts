import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../orders/guards/staff.guard';
import { SavePromotionDto } from './promotion.dto';
import { PromotionsService } from './promotions.service';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  findAvailable() {
    return this.promotionsService.findAvailable();
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, StaffGuard)
  findAllForStaff() {
    return this.promotionsService.findAllForStaff();
  }

  @Post()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: SavePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(':code')
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(@Param('code') code: string, @Body() dto: SavePromotionDto) {
    return this.promotionsService.update(code, dto);
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, StaffGuard)
  deactivate(@Param('code') code: string) {
    return this.promotionsService.deactivate(code);
  }
}
