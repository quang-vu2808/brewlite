import 'reflect-metadata';
import type { DataSource, EntityManager } from 'typeorm';
import { IngredientsService } from './ingredients.service';
import { ProductsService } from '../products/products.service';
import { IngredientRecipeEntity } from './entities/ingredient-recipe.entity';
import { IngredientEntity } from './entities/ingredient.entity';
import {
  ProductPackagingRecipeEntity,
  ProductSizeRecipeEntity,
  ProductSizeRecipeItemEntity,
  ToppingEntity,
} from './entities/product-size-recipe.entity';

describe('IngredientsService inventory availability', () => {
  const milk = {
    id: 'milk-id',
    name: 'Sữa',
    code: 'MILK',
    unit: 'ml',
    stock: 300,
  };
  const recipes = [
    { productId: 1, ingredientId: milk.id, quantityRequired: 100, ingredient: milk },
    { productId: 2, ingredientId: milk.id, quantityRequired: 100, ingredient: milk },
  ];
  const find = jest.fn();
  const query = jest.fn();
  const manager = { find, query } as unknown as EntityManager;
  const service = new IngredientsService(
    { manager } as unknown as DataSource,
    new ProductsService(),
  );

  beforeEach(() => {
    find.mockReset();
    find.mockResolvedValue(recipes);
    query.mockReset();
  });

  it('calculates maximum cups from the scarcest recipe ingredient and distinguishes missing recipes', async () => {
    const beans = { id: 'beans', stock: 400, isActive: true, kind: 'INGREDIENT' };
    const milkStock = { id: 'milk-stock', stock: 80, isActive: true, kind: 'INGREDIENT' };
    const cups = ['S', 'M', 'L'].map((size) => ({
      id: `cup-${size}`,
      name: `Ly ${size}`,
      unit: 'cái',
      stock: 1000,
      kind: 'PACKAGING',
      category: 'CUP',
      isActive: true,
      compatibleSizes: [size],
    }));
    find.mockImplementation((entity: unknown) => Promise.resolve(
      entity === ProductSizeRecipeEntity
        ? [
          { productId: 1, size: 'M', approvalStatus: 'CONFIRMED' },
          { productId: 2, size: 'S', approvalStatus: 'CONFIRMED' },
        ]
        : entity === ProductSizeRecipeItemEntity
          ? [
            { productId: 1, size: 'M', quantityRequired: 100, ingredient: beans },
            { productId: 1, size: 'M', quantityRequired: 20, ingredient: milkStock },
            { productId: 2, size: 'S', quantityRequired: 100, ingredient: { ...beans, stock: 300 } },
          ]
          : entity === IngredientEntity
            ? cups
          : [],
    ));
    const availability = await service.getProductAvailability();
    expect(availability).toEqual(expect.arrayContaining([
      expect.objectContaining({
        productId: 1, stock: 4, available: true, recipeConfigured: true,
        sizes: expect.arrayContaining([expect.objectContaining({ size: 'M', stock: 4 })]),
      }),
      expect.objectContaining({ productId: 2, stock: 3, available: true, recipeConfigured: true }),
      expect.objectContaining({ productId: 3, stock: 0, available: false, recipeConfigured: false }),
    ]));
  });

  it('does not apply the shared recipe to a size without an explicitly configured size recipe', async () => {
    const beans = { id: 'beans', name: 'Cà phê', code: 'COFFEE', unit: 'g', stock: 299, kind: 'INGREDIENT', isActive: true };
    find.mockImplementation((entity: unknown) => Promise.resolve(
      entity === IngredientRecipeEntity
        ? [{ productId: 1, ingredientId: beans.id, quantityRequired: 100, ingredient: beans }]
        : entity === ProductSizeRecipeEntity
          ? [{ productId: 1, size: 'S', approvalStatus: 'CONFIRMED' }]
          : entity === ProductSizeRecipeItemEntity
            ? [{ productId: 1, size: 'S', ingredientId: beans.id, quantityRequired: 50, ingredient: beans }]
            : [],
    ));

    await expect(service.checkOrderAvailability(manager, [
      { productId: 1, size: 'S', quantity: 2 },
      { productId: 1, size: 'M', quantity: 2 },
    ])).resolves.toMatchObject({
      available: false,
      shortages: [],
      unconfiguredSizes: [{ productId: 1, size: 'M' }],
    });
  });

  it('aggregates size recipe, packaging and topping needs before any stock write', async () => {
    const beans = { id: 'beans', name: 'Cà phê', code: 'COFFEE', unit: 'g', stock: 1000, kind: 'INGREDIENT', isActive: true };
    const pearls = { id: 'pearls-stock', name: 'Trân châu', code: 'PEARLS', unit: 'g', stock: 39, kind: 'INGREDIENT', isActive: true };
    const cups = { id: 'cups', name: 'Ly M', code: 'CUP_M', unit: 'cai', stock: 1, kind: 'PACKAGING', isActive: true, compatibleSizes: ['M'] };
    find.mockImplementation((entity: unknown) => Promise.resolve(
      entity === ProductSizeRecipeEntity
        ? [{ productId: 1, size: 'M', approvalStatus: 'CONFIRMED' }]
        : entity === ProductSizeRecipeItemEntity
          ? [{ productId: 1, size: 'M', ingredientId: beans.id, quantityRequired: 10, ingredient: beans }]
        : entity === ProductPackagingRecipeEntity
          ? [{ productId: 1, size: 'M', ingredientId: cups.id, usageType: 'PER_GROUP', quantityRequired: 1, servingsPerUnit: 2, ingredient: cups }]
          : entity === ToppingEntity
            ? [{ id: 'pearls', isActive: true, ingredient: pearls, portionQuantityRequired: 50 }]
            : [],
    ));

    await expect(service.checkOrderAvailability(manager, [{
      productId: 1,
      size: 'M',
      quantity: 3,
      toppings: [{ id: 'pearls', quantity: 4 }],
    }])).resolves.toMatchObject({
      available: false,
      shortages: [
        expect.objectContaining({ ingredientId: pearls.id, required: 600, available: 39 }),
        expect.objectContaining({ ingredientId: cups.id, required: 2, available: 1 }),
      ],
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('uses the single shared size-matched cup inventory across drinks', async () => {
    const sharedCup = {
      id: 'shared-m-cup',
      name: 'Ly M dùng chung',
      code: 'CUP_M',
      unit: 'cái',
      stock: 1,
      kind: 'PACKAGING',
      category: 'CUP',
      isActive: true,
      compatibleSizes: ['M'],
    };
    const drinkRecipes = [
      { productId: 1, size: 'M', ingredientId: milk.id, quantityRequired: 10, ingredient: milk },
      { productId: 2, size: 'M', ingredientId: milk.id, quantityRequired: 10, ingredient: milk },
    ];
    find.mockImplementation((entity: unknown) => Promise.resolve(
      entity === ProductSizeRecipeEntity
        ? [
          { productId: 1, size: 'M', approvalStatus: 'CONFIRMED' },
          { productId: 2, size: 'M', approvalStatus: 'CONFIRMED' },
        ]
        : entity === ProductSizeRecipeItemEntity
          ? drinkRecipes
          : entity === IngredientEntity ? [sharedCup] : [],
    ));

    await expect(service.checkOrderAvailability(manager, [
      { productId: 1, size: 'M', quantity: 1 },
      { productId: 2, size: 'M', quantity: 1 },
    ])).resolves.toMatchObject({
      available: false,
      shortages: [expect.objectContaining({ ingredientId: sharedCup.id, required: 2, available: 1 })],
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('blocks an order when its mandatory size-matched cup is missing', async () => {
    find.mockImplementation((entity: unknown) => Promise.resolve(
      entity === ProductSizeRecipeEntity
        ? [{ productId: 1, size: 'M', approvalStatus: 'CONFIRMED' }]
        : entity === ProductSizeRecipeItemEntity
          ? [{ productId: 1, size: 'M', ingredientId: milk.id, quantityRequired: 10, ingredient: milk }]
          : [],
    ));

    await expect(service.checkOrderAvailability(manager, [
      { productId: 1, size: 'M', quantity: 1 },
    ])).resolves.toMatchObject({
      available: false,
      unconfiguredPackaging: ['CUP_M'],
    });
    expect(query).not.toHaveBeenCalled();
  });

  it('does not count or consume size recipes while they await confirmation', async () => {
    const beans = {
      id: 'beans',
      name: 'Cà phê',
      code: 'COFFEE',
      unit: 'g',
      stock: 1000,
      kind: 'INGREDIENT',
      isActive: true,
    };
    const cup = {
      id: 'cup-m',
      name: 'Ly M',
      code: 'CUP_M',
      unit: 'cái',
      stock: 1000,
      kind: 'PACKAGING',
      category: 'CUP',
      isActive: true,
      compatibleSizes: ['M'],
    };
    find.mockImplementation((entity: unknown) => Promise.resolve(
      entity === ProductSizeRecipeEntity
        ? [{ productId: 1, size: 'M', approvalStatus: 'PENDING' }]
        : entity === ProductSizeRecipeItemEntity
          ? [{ productId: 1, size: 'M', ingredientId: beans.id, quantityRequired: 10, ingredient: beans }]
          : entity === IngredientEntity ? [cup] : [],
    ));

    await expect(service.checkOrderAvailability(manager, [
      { productId: 1, size: 'M', quantity: 1 },
    ])).resolves.toMatchObject({
      available: false,
      unconfiguredSizes: [{ productId: 1, size: 'M' }],
    });
    await expect(service.reserveOrderItems(manager, [
      { productId: 1, size: 'M', quantity: 1 },
    ])).rejects.toThrow('Chưa cấu hình công thức');
    expect(query).not.toHaveBeenCalled();
  });

  it('saves edited size recipes as pending until an explicit manager confirmation', async () => {
    const dataManager = {
      find: jest.fn().mockResolvedValue([{
        id: 'beans',
        kind: 'INGREDIENT',
        isActive: true,
      }]),
      upsert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = jest.fn((callback: (txManager: typeof dataManager) => unknown) =>
      callback(dataManager),
    );
    const recipeService = new IngredientsService(
      { manager, transaction } as unknown as DataSource,
      new ProductsService(),
    );

    await recipeService.replaceSizeRecipe(1, 'S', [{
      ingredientId: 'beans',
      quantityRequired: 12,
    }]);

    expect(dataManager.upsert).toHaveBeenCalledWith(
      ProductSizeRecipeEntity,
      { productId: 1, size: 'S', approvalStatus: 'PENDING' },
      ['productId', 'size'],
    );
  });

  it('confirms only a valid size recipe with exactly one compatible active cup', async () => {
    const recipe = { productId: 1, size: 'S', approvalStatus: 'PENDING' };
    const beans = {
      id: 'beans',
      kind: 'INGREDIENT',
      isActive: true,
    };
    const cup = {
      id: 'cup-s',
      kind: 'PACKAGING',
      category: 'CUP',
      isActive: true,
      compatibleSizes: ['S'],
    };
    const dataManager = {
      findOne: jest.fn().mockResolvedValue(recipe),
      find: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(
        entity === ProductSizeRecipeItemEntity
          ? [{ ingredient: beans, quantityRequired: 12 }]
          : entity === IngredientEntity
            ? [cup]
            : [],
      )),
      save: jest.fn().mockImplementation((_entity: unknown, value: typeof recipe) =>
        Promise.resolve(value),
      ),
    };
    const transaction = jest.fn((callback: (txManager: typeof dataManager) => unknown) =>
      callback(dataManager),
    );
    const recipeService = new IngredientsService(
      { manager, transaction } as unknown as DataSource,
      new ProductsService(),
    );

    await expect(recipeService.confirmSizeRecipe(1, 'S')).resolves.toMatchObject({
      productId: 1,
      size: 'S',
      approvalStatus: 'CONFIRMED',
    });
    expect(dataManager.findOne).toHaveBeenCalledWith(ProductSizeRecipeEntity, {
      where: { productId: 1, size: 'S' },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('calculates topping portions from the linked shared ingredient stock', async () => {
    const pearls = {
      id: 'pearls',
      name: 'Trân châu',
      surcharge: 5000,
      isActive: true,
      portionQuantityRequired: 50,
      ingredient: {
        id: 'pearls-stock',
        kind: 'INGREDIENT',
        unit: 'g',
        isActive: true,
        stock: 1000,
      },
    };
    find.mockImplementation((entity: unknown) =>
      Promise.resolve(entity === ToppingEntity ? [pearls] : []),
    );

    await expect(service.findToppingsForProduct(1, 'M')).resolves.toEqual([
      expect.objectContaining({
        id: 'pearls',
        availablePortions: 20,
        available: true,
        portionQuantityRequired: 50,
        ingredientUnit: 'g',
      }),
    ]);

    pearls.ingredient.stock = 40;
    await expect(service.findToppingsForProduct(1, 'M')).resolves.toEqual([
      expect.objectContaining({ id: 'pearls', availablePortions: 0, available: false }),
    ]);
  });

  it('does not infer an unconfirmed topping portion from a product recipe', async () => {
    const pearls = {
      id: 'pearls',
      isActive: true,
      portionQuantityRequired: null,
      ingredient: { id: 'pearls-stock', kind: 'INGREDIENT', isActive: true, stock: 1000 },
    };
    find.mockImplementation((entity: unknown) =>
      Promise.resolve(entity === ToppingEntity ? [pearls] : []),
    );

    await expect(service.findToppingsForProduct(1, 'M')).resolves.toEqual([
      expect.objectContaining({
        id: 'pearls',
        portionQuantityRequired: null,
        availablePortions: 0,
        configured: false,
        available: false,
      }),
    ]);
  });

  it('offers active configured toppings for every product and size without a recipe rule or manual cap', async () => {
    const pearls = {
      id: 'pearls',
      name: 'Trân châu',
      surcharge: 5000,
      isActive: true,
      portionQuantityRequired: 25,
      ingredient: {
        id: 'pearls-stock',
        kind: 'INGREDIENT',
        isActive: true,
        stock: 120,
      },
    };
    const findTopping = jest.fn().mockResolvedValue([pearls]);
    const sharedService = new IngredientsService(
      { manager: { find: findTopping } } as unknown as DataSource,
      new ProductsService(),
    );

    await expect(sharedService.findToppingsForProduct(1, 'S')).resolves.toEqual([
      expect.objectContaining({ id: 'pearls', availablePortions: 4, maxPortions: 4, available: true }),
    ]);
    await expect(sharedService.findToppingsForProduct(99, 'L')).resolves.toEqual([
      expect.objectContaining({ id: 'pearls', availablePortions: 4, maxPortions: 4, available: true }),
    ]);
    expect(findTopping).toHaveBeenCalledTimes(2);
    expect(findTopping).toHaveBeenCalledWith(ToppingEntity, expect.objectContaining({
      relations: { ingredient: true },
    }));
  });

  it('blocks an unlinked topping without affecting the drink recipe', async () => {
    find.mockImplementation((entity: unknown) => Promise.resolve(
      entity === IngredientRecipeEntity ? recipes : [],
    ));
    await expect(service.checkOrderAvailability(manager, [{
      productId: 1,
      size: 'M',
      quantity: 1,
      toppings: [{ id: 'pearls', quantity: 1 }],
    }])).resolves.toMatchObject({
      available: false,
      unconfiguredToppings: ['pearls'],
    });
  });

  it('aggregates shared ingredient demand across cart lines without writing inventory', async () => {
    const overCapacity = await service.checkAvailability(manager, new Map([[1, 2], [2, 2]]));
    expect(overCapacity).toEqual({
      available: false,
      shortages: [{
        ingredientId: milk.id,
        ingredientName: 'Sữa',
        unit: 'ml',
        required: 400,
        available: 300,
      }],
      unconfiguredProducts: [],
    });

    await expect(service.checkAvailability(manager, new Map([[1, 2], [2, 1]])))
      .resolves.toMatchObject({ available: true, shortages: [], unconfiguredProducts: [] });
    expect(query).not.toHaveBeenCalled();
  });

  it('reports products without recipes separately from depleted ingredients', async () => {
    await expect(service.checkAvailability(manager, new Map([[3, 1]]))).resolves.toEqual({
      available: false,
      shortages: [],
      unconfiguredProducts: [3],
    });
  });
});
