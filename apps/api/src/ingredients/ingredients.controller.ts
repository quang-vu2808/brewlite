import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Patch,
  Req,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffGuard } from '../orders/guards/staff.guard';
import { AdjustIngredientStockDto } from './dto/adjust-ingredient-stock.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { ReplaceProductRecipeDto } from './dto/replace-product-recipe.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { ReplaceSizeRecipeDto } from './dto/replace-size-recipe.dto';
import { ReplacePackagingRecipeDto } from './dto/replace-packaging-recipe.dto';
import { ReplaceToppingRecipeDto } from './dto/replace-topping-recipe.dto';
import { IngredientsService } from './ingredients.service';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';

@Controller('ingredients')
@UseGuards(JwtAuthGuard, StaffGuard)
export class IngredientsController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get()
  findAll() {
    return this.ingredients.findAll();
  }

  @Post()
  create(
    @Body() dto: CreateIngredientDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ingredients.create(dto, request.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.ingredients.update(id, dto);
  }

  @Get(':id/adjustments')
  listAdjustments(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ingredients.listAdjustments(id);
  }

  @Post(':id/adjustments')
  adjustStock(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AdjustIngredientStockDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ingredients.adjustStock(id, dto.delta, dto.reason, request.user.id);
  }

  @Get('recipes')
  listRecipes() {
    return this.ingredients.listRecipes();
  }

  @Put('recipes/:productId')
  replaceRecipe(
    @Param('productId', new ParseIntPipe()) productId: number,
    @Body() dto: ReplaceProductRecipeDto,
  ) {
    return this.ingredients.replaceRecipe(productId, dto.items);
  }

  @Put('recipes/:productId/:size')
  replaceSizeRecipe(
    @Param('productId', new ParseIntPipe()) productId: number,
    @Param('size') size: 'S' | 'M' | 'L',
    @Body() dto: ReplaceSizeRecipeDto,
  ) {
    if (!['S', 'M', 'L'].includes(size) || dto.size !== size) {
      throw new BadRequestException('Size công thức không hợp lệ');
    }
    return this.ingredients.replaceSizeRecipe(productId, size, dto.items);
  }

  @Patch('recipes/:productId/:size/confirm')
  confirmSizeRecipe(
    @Param('productId', new ParseIntPipe()) productId: number,
    @Param('size') size: 'S' | 'M' | 'L',
  ) {
    if (!['S', 'M', 'L'].includes(size)) {
      throw new BadRequestException('Size công thức không hợp lệ');
    }
    return this.ingredients.confirmSizeRecipe(productId, size);
  }

  @Put('packaging-recipes/:productId/:size')
  replacePackagingRecipe(
    @Param('productId', new ParseIntPipe()) productId: number,
    @Param('size') size: 'S' | 'M' | 'L',
    @Body() dto: ReplacePackagingRecipeDto,
  ) {
    if (!['S', 'M', 'L'].includes(size) || dto.size !== size) {
      throw new BadRequestException('Size vật tư không hợp lệ');
    }
    return this.ingredients.replacePackagingRecipe(productId, size, dto.items);
  }

  @Put('topping-recipes/:productId/:size')
  replaceToppingRecipe(
    @Param('productId', new ParseIntPipe()) productId: number,
    @Param('size') size: 'S' | 'M' | 'L',
    @Body() dto: ReplaceToppingRecipeDto,
  ) {
    if (!['S', 'M', 'L'].includes(size) || dto.size !== size) {
      throw new BadRequestException('Size topping không hợp lệ');
    }
    return this.ingredients.replaceProductToppings(productId, size, dto.items);
  }
}
