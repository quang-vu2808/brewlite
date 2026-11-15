import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../orders/guards/staff.guard';
import { UpdateToppingDto } from './dto/update-topping.dto';
import { CreateToppingDto } from './dto/create-topping.dto';
import { IngredientsService } from './ingredients.service';

@Controller('toppings')
export class ToppingsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get()
  listAvailable(@Query('productId') productId?: string, @Query('size') size?: string) {
    if (!productId && !size) throw new BadRequestException('Cần chọn sản phẩm và size để tải topping');
    if (!productId || !/^[1-9]\d*$/.test(productId) || !size || !['S', 'M', 'L'].includes(size)) {
      throw new BadRequestException('Sản phẩm hoặc size topping không hợp lệ');
    }
    return this.ingredients.findToppings(false, Number(productId), size as 'S' | 'M' | 'L');
  }

  @Get('staff')
  @UseGuards(JwtAuthGuard, StaffGuard)
  listForStaff() {
    return this.ingredients.findToppings(true);
  }

  @Post()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: CreateToppingDto) {
    return this.ingredients.createTopping(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(@Param('id') id: string, @Body() dto: UpdateToppingDto) {
    return this.ingredients.updateTopping(id, dto);
  }
}
