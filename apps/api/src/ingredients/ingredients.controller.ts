import {
  Body,
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
  create(@Body() dto: CreateIngredientDto) {
    return this.ingredients.create(dto);
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
}
