import { Controller, Get } from '@nestjs/common';
import { IngredientsService } from '../ingredients/ingredients.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly ingredients: IngredientsService) {}

  @Get()
  async findAll() {
    return this.ingredients.getProductAvailability();
  }
}
