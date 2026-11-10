import { IngredientsService } from '../ingredients/ingredients.service';
import { InventoryController } from './inventory.controller';

describe('InventoryController', () => {
  it('keeps GET /inventory delegated to ingredient-backed availability', async () => {
    const records = [{
      productId: 1,
      productName: 'Cà phê sữa',
      stock: 3,
      available: true,
      recipeConfigured: true,
    }];
    const getProductAvailability = jest.fn().mockResolvedValue(records);
    const ingredients = {
      getProductAvailability,
    } as unknown as IngredientsService;
    const controller = new InventoryController(ingredients);

    await expect(controller.findAll()).resolves.toBe(records);
    expect(getProductAvailability).toHaveBeenCalledTimes(1);
  });
});
