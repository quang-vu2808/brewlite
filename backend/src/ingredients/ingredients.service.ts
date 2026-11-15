import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { IngredientEntity } from './entities/ingredient.entity';
import { IngredientRecipeEntity } from './entities/ingredient-recipe.entity';
import { OrderIngredientConsumptionEntity } from './entities/order-ingredient-consumption.entity';
import { IngredientAdjustmentEntity } from './entities/ingredient-adjustment.entity';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import {
  ProductPackagingRecipeEntity,
  ProductSizeRecipeEntity,
  ProductSizeRecipeItemEntity,
  ProductToppingRecipeEntity,
  ToppingEntity,
} from './entities/product-size-recipe.entity';

type IngredientStockRow = { stock: number; version: number };
type ReservedIngredient = {
  ingredientId: string;
  ingredientName: string;
  ingredientCode: string;
  ingredientUnit: string;
  quantity: number;
};

export type InventoryShortage = {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  required: number;
  available: number;
};

export type InventoryCheckResult = {
  available: boolean;
  shortages: InventoryShortage[];
  unconfiguredProducts: number[];
  unconfiguredSizes?: Array<{ productId: number; size: 'S' | 'M' | 'L' }>;
  unconfiguredToppings?: string[];
  unconfiguredPackaging?: string[];
};

export type OrderInventoryLine = {
  productId: number;
  size: 'S' | 'M' | 'L';
  quantity: number;
  toppings?: Array<{ id: string; quantity: number }>;
};

type IngredientRequirement = {
  ingredient: IngredientEntity;
  quantity: number;
};

function isCupPackaging(ingredient: IngredientEntity) {
  const category = ingredient.category?.trim().toLocaleUpperCase();
  return ingredient.kind === 'PACKAGING' && (category === 'CUP' || category === 'LY');
}

@Injectable()
export class IngredientsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
  ) {}

  async findAll() {
    const ingredients = await this.dataSource.manager.find(IngredientEntity, {
      order: { name: 'ASC' },
    });
    return ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      code: ingredient.code,
      unit: ingredient.unit,
      stock: ingredient.stock,
      warningThreshold: ingredient.warningThreshold,
      version: ingredient.version,
      createdAt: ingredient.createdAt,
      lowStock: ingredient.stock <= ingredient.warningThreshold,
      kind: ingredient.kind,
      category: ingredient.category,
      isActive: ingredient.isActive,
      compatibleSizes: ingredient.compatibleSizes,
    }));
  }

  async create(dto: CreateIngredientDto, staffUserId: string) {
    if (dto.kind === 'PACKAGING' &&
        (!dto.category?.trim() || !dto.compatibleSizes?.length)) {
      throw new BadRequestException('Vật tư đóng gói cần có nhóm và size tương thích');
    }
    try {
      return await this.dataSource.transaction(async (manager) => {
        const ingredient = await manager.save(IngredientEntity, {
          stock: dto.stock,
          warningThreshold: dto.warningThreshold,
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          unit: dto.unit.trim(),
          kind: dto.kind ?? 'INGREDIENT',
          category: dto.category?.trim() || null,
          compatibleSizes: dto.compatibleSizes ?? [],
          isActive: true,
          version: 1,
        });
        if (dto.stock > 0) {
          await manager.save(IngredientAdjustmentEntity, {
            ingredientId: ingredient.id,
            staffUserId,
            delta: dto.stock,
            reason: 'Tồn đầu kỳ khi tạo nguyên liệu',
          });
        }
        return ingredient;
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        error.driverError !== null &&
        'code' in error.driverError &&
        error.driverError.code === '23505'
      ) {
        throw new ConflictException('Mã nguyên liệu đã tồn tại');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateIngredientDto) {
    try {
      const ingredient = await this.dataSource.manager.findOne(IngredientEntity, { where: { id } });
      if (!ingredient) throw new NotFoundException('Không tìm thấy nguyên liệu');
      if ((dto.kind ?? ingredient.kind) === 'PACKAGING' &&
          (!(dto.category ?? ingredient.category)?.trim() ||
            !(dto.compatibleSizes ?? ingredient.compatibleSizes).length)) {
        throw new BadRequestException('Vật tư đóng gói cần có nhóm và size tương thích');
      }
      const update = {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
        ...(dto.warningThreshold !== undefined ? { warningThreshold: dto.warningThreshold } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.category !== undefined ? { category: dto.category?.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.compatibleSizes !== undefined ? { compatibleSizes: dto.compatibleSizes } : {}),
      };
      if (!Object.keys(update).length) throw new BadRequestException('Không có thông tin cần cập nhật');
      await this.dataSource.manager.update(IngredientEntity, { id }, update);
      return this.dataSource.manager.findOneByOrFail(IngredientEntity, { id });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        error.driverError !== null &&
        'code' in error.driverError &&
        error.driverError.code === '23505'
      ) {
        throw new ConflictException('Mã nguyên liệu đã tồn tại');
      }
      throw error;
    }
  }

  async adjustStock(id: string, delta: number, reason: string, staffUserId: string) {
    if (!reason.trim()) throw new BadRequestException('Cần ghi lý do điều chỉnh kho');
    return this.dataSource.transaction(async (manager) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const ingredient = await manager.findOne(IngredientEntity, { where: { id } });
        if (!ingredient) throw new NotFoundException('Không tìm thấy nguyên liệu');
        const result: unknown = await manager.query(
          `UPDATE "ingredients"
           SET "stock" = "stock" + $1, "version" = "version" + 1
           WHERE "id" = $2 AND "version" = $3
             AND "stock" + $1 >= 0 AND "stock" + $1 <= 2147483647
           RETURNING "stock", "version"`,
          [delta, id, ingredient.version],
        );
        const rows = normalizeRows<IngredientStockRow>(result);
        if (rows.length === 1) {
          const adjustment = await manager.save(IngredientAdjustmentEntity, {
            ingredientId: ingredient.id,
            staffUserId,
            delta,
            reason: reason.trim(),
          });
          return {
            id: ingredient.id,
            name: ingredient.name,
            code: ingredient.code,
            unit: ingredient.unit,
            stock: rows[0].stock,
            warningThreshold: ingredient.warningThreshold,
            version: rows[0].version,
            createdAt: ingredient.createdAt,
            adjustmentId: adjustment.id,
          };
        }
      }
      throw new ConflictException('Tồn nguyên liệu vừa thay đổi; vui lòng thử lại');
    });
  }

  async listAdjustments(ingredientId: string) {
    const ingredient = await this.dataSource.manager.findOne(IngredientEntity, {
      where: { id: ingredientId },
    });
    if (!ingredient) throw new NotFoundException('Không tìm thấy nguyên liệu');
    const [adjustments, consumptions] = await Promise.all([
      this.dataSource.manager.find(IngredientAdjustmentEntity, {
        where: { ingredientId },
        relations: { staffUser: true },
        order: { createdAt: 'DESC' },
      }),
      this.dataSource.manager.find(OrderIngredientConsumptionEntity, {
        where: { ingredientId },
        relations: { order: true },
      }),
    ]);
    const events = [
      ...adjustments.map((adjustment) => ({
        id: `adjustment-${adjustment.id}`,
        delta: adjustment.delta,
        reason: adjustment.reason,
        createdAt: adjustment.createdAt,
        staffEmail: adjustment.staffUser.email,
      })),
      ...consumptions.flatMap((consumption) => [
        {
          id: `consumption-${consumption.id}`,
          delta: -consumption.quantity,
          reason: `Xuất kho đơn ${consumption.orderId}`,
          createdAt: consumption.order.createdAt,
          staffEmail: 'Hệ thống',
        },
        ...(consumption.order.inventoryReleasedAt ? [{
          id: `release-${consumption.id}`,
          delta: consumption.quantity,
          reason: `Hoàn kho đơn ${consumption.orderId}`,
          createdAt: consumption.order.inventoryReleasedAt,
          staffEmail: 'Hệ thống',
        }] : []),
      ]),
    ];
    return events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);
  }

  async listRecipes() {
    const products = this.productsService.findAll();
    const [recipes, sizeRecipes, sizeItems, packaging, toppingRules, availability] = await Promise.all([
      this.dataSource.manager.find(IngredientRecipeEntity, {
      relations: { ingredient: true },
      order: { productId: 'ASC' },
      }),
      this.dataSource.manager.find(ProductSizeRecipeEntity, { order: { productId: 'ASC', size: 'ASC' } }),
      this.dataSource.manager.find(ProductSizeRecipeItemEntity, {
        relations: { ingredient: true },
        order: { productId: 'ASC', size: 'ASC' },
      }),
      this.dataSource.manager.find(ProductPackagingRecipeEntity, {
        relations: { ingredient: true },
        order: { productId: 'ASC', size: 'ASC' },
      }),
      this.dataSource.manager.find(ProductToppingRecipeEntity, {
        relations: { topping: true },
        order: { productId: 'ASC', size: 'ASC' },
      }),
      this.getProductAvailability(),
    ]);
    return products.map((product) => ({
      productId: product.id,
      productName: product.name,
      items: recipes
        .filter((recipe) => recipe.productId === product.id)
        .map((recipe) => ({
          ingredientId: recipe.ingredientId,
          ingredientName: recipe.ingredient.name,
          unit: recipe.ingredient.unit,
          quantityRequired: recipe.quantityRequired,
        })),
      sizes: (['S', 'M', 'L'] as const).map((size) => {
        const header = sizeRecipes.find((recipe) =>
          recipe.productId === product.id && recipe.size === size,
        );
        const sizeAvailability = availability.find((record) => record.productId === product.id)
          ?.sizes?.find((record) => record.size === size) ?? null;
        const sizeItemsForRecipe = sizeItems.filter((recipe) =>
          recipe.productId === product.id && recipe.size === size,
        );
        const statusReason = !header
          ? 'Size chưa có công thức riêng. Chọn nguyên liệu và định lượng, sau đó lưu bản nháp.'
          : header.approvalStatus !== 'CONFIRMED'
            ? 'Cần quản lý kiểm tra và xác nhận định lượng trước khi bán.'
            : !sizeItemsForRecipe.length ||
                sizeItemsForRecipe.some((item) =>
                  !item.ingredient.isActive || item.ingredient.kind !== 'INGREDIENT',
                )
              ? 'Công thức thiếu nguyên liệu đang hoạt động hoặc định lượng hợp lệ.'
              : !sizeAvailability?.packagingConfigured
                ? `Cần cấu hình đúng một loại ly đang hoạt động tương thích size ${size}.`
                : null;
        return {
          size,
          configured: Boolean(header),
          approvalStatus: header?.approvalStatus ?? null,
          statusReason,
          availability: sizeAvailability,
          items: sizeItems
            .filter((recipe) => recipe.productId === product.id && recipe.size === size)
            .map((recipe) => ({
              ingredientId: recipe.ingredientId,
              ingredientName: recipe.ingredient.name,
              unit: recipe.ingredient.unit,
              quantityRequired: recipe.quantityRequired,
            })),
          packaging: packaging
            .filter((rule) => rule.productId === product.id && rule.size === size)
            .map((rule) => ({
              ingredientId: rule.ingredientId,
              ingredientName: rule.ingredient.name,
              unit: rule.ingredient.unit,
              usageType: rule.usageType,
              quantityRequired: rule.quantityRequired,
              servingsPerUnit: rule.servingsPerUnit,
            })),
          toppings: toppingRules
            .filter((rule) => rule.productId === product.id && rule.size === size)
            .map((rule) => ({
              toppingId: rule.toppingId,
              toppingName: rule.topping.name,
              quantityRequired: rule.quantityRequired,
              maxPortions: rule.maxPortions,
            })),
        };
      }),
    }));
  }

  async getProductAvailability() {
    const products = this.productsService.findAll();
    const [sizeRecipes, sizeItems, packaging, cupInventory] = await Promise.all([
      this.dataSource.manager.find(ProductSizeRecipeEntity),
      this.dataSource.manager.find(ProductSizeRecipeItemEntity, { relations: { ingredient: true } }),
      this.dataSource.manager.find(ProductPackagingRecipeEntity, { relations: { ingredient: true } }),
      this.dataSource.manager.find(IngredientEntity, { where: { kind: 'PACKAGING' } }),
    ]);
    return products.map((product) => {
      const sizes = (['S', 'M', 'L'] as const).map((size) => {
        const configuredSize = sizeRecipes.some((recipe) =>
          recipe.productId === product.id && recipe.size === size &&
          recipe.approvalStatus === 'CONFIRMED',
        );
        const recipeItems = configuredSize
          ? sizeItems.filter((recipe) => recipe.productId === product.id && recipe.size === size)
          : [];
        const packagingItems = packaging.filter((rule) =>
          rule.productId === product.id && rule.size === size,
        );
        const cups = cupInventory.filter((ingredient) =>
          isCupPackaging(ingredient) && ingredient.compatibleSizes.includes(size),
        );
        const recipeConfigured = recipeItems.length > 0 &&
          recipeItems.every((recipe) => recipe.ingredient.isActive && recipe.ingredient.kind === 'INGREDIENT');
        let stock = recipeConfigured
          ? Math.min(...recipeItems.map((recipe) =>
            Math.floor(recipe.ingredient.stock / recipe.quantityRequired),
          ))
          : 0;
        if (recipeConfigured) {
          if (cups.length !== 1 || !cups[0].isActive) {
            stock = 0;
          } else {
            stock = Math.min(stock, cups[0].stock);
          }
          for (const rule of packagingItems) {
            if (isCupPackaging(rule.ingredient)) continue;
            if (!rule.ingredient.isActive || rule.ingredient.kind !== 'PACKAGING') {
              stock = 0;
              break;
            }
            if (!rule.ingredient.compatibleSizes.includes(size)) {
              stock = 0;
              break;
            }
            if (rule.usageType === 'PER_ORDER') {
              if (rule.ingredient.stock < rule.quantityRequired) stock = 0;
            } else {
              const servingLimit = Math.floor(
                rule.ingredient.stock * (rule.usageType === 'PER_GROUP' ? rule.servingsPerUnit : 1) /
                  rule.quantityRequired,
              );
              stock = Math.min(stock, servingLimit);
            }
          }
        }
        return {
          size,
          stock,
          available: recipeConfigured && stock > 0,
          recipeConfigured,
          usesSharedRecipe: false,
          packagingConfigured: packagingItems.length > 0 ||
            (cups.length === 1 && cups[0].isActive),
        };
      });
      const configuredSizes = sizes.filter((size) => size.recipeConfigured);
      const recipeConfigured = configuredSizes.length > 0;
      const stock = configuredSizes.length ? Math.max(...configuredSizes.map((size) => size.stock)) : 0;
      return {
        productId: product.id,
        productName: product.name,
        stock,
        available: recipeConfigured && stock > 0,
        recipeConfigured,
        sizes,
      };
    });
  }

  async replaceSizeRecipe(
    productId: number,
    size: 'S' | 'M' | 'L',
    items: Array<{ ingredientId: string; quantityRequired: number }>,
  ) {
    const product = this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.dataSource.transaction(async (manager) => {
      if (items.length) {
        const ids = [...new Set(items.map((item) => item.ingredientId))];
        const found = await manager.find(IngredientEntity, { where: { id: In(ids) } });
        if (found.length !== ids.length || found.some((ingredient) =>
          ingredient.kind !== 'INGREDIENT' || !ingredient.isActive,
        )) {
          throw new BadRequestException('Công thức phải sử dụng nguyên liệu đang hoạt động');
        }
      }
      if (items.length) {
        await manager.upsert(
          ProductSizeRecipeEntity,
          { productId, size, approvalStatus: 'PENDING' },
          ['productId', 'size'],
        );
        await manager.delete(ProductSizeRecipeItemEntity, { productId, size });
        await manager.save(ProductSizeRecipeItemEntity, items.map((item) => ({
          ...item,
          productId,
          size,
        })));
      } else {
        await manager.delete(ProductSizeRecipeEntity, { productId, size });
      }
      return { productId, productName: product.name, size, configured: items.length > 0, items };
    });
  }

  async confirmSizeRecipe(productId: number, size: 'S' | 'M' | 'L') {
    const product = this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.dataSource.transaction(async (manager) => {
      const recipe = await manager.findOne(ProductSizeRecipeEntity, {
        where: { productId, size },
        lock: { mode: 'pessimistic_write' },
      });
      if (!recipe) throw new BadRequestException('Size chưa có công thức để xác nhận');
      const items = await manager.find(ProductSizeRecipeItemEntity, {
        where: { productId, size },
        relations: { ingredient: true },
      });
      if (!items.length || items.some((item) =>
        !item.ingredient.isActive || item.ingredient.kind !== 'INGREDIENT' ||
        !Number.isSafeInteger(item.quantityRequired) || item.quantityRequired < 1,
      )) {
        throw new BadRequestException('Công thức cần nguyên liệu đang hoạt động và định lượng hợp lệ');
      }
      const ingredients = await manager.find(IngredientEntity, {
        where: { kind: 'PACKAGING' },
      });
      const cups = ingredients.filter((ingredient) =>
        isCupPackaging(ingredient) && ingredient.compatibleSizes.includes(size),
      );
      if (cups.length !== 1 || !cups[0].isActive) {
        throw new BadRequestException(`Cần đúng một loại ly đang hoạt động tương thích size ${size}`);
      }
      const packagingRules = await manager.find(ProductPackagingRecipeEntity, {
        where: { productId, size },
        relations: { ingredient: true },
      });
      if (packagingRules.some((rule) =>
        !rule.ingredient.isActive || rule.ingredient.kind !== 'PACKAGING' ||
        !rule.ingredient.compatibleSizes.includes(size) || isCupPackaging(rule.ingredient),
      )) {
        throw new BadRequestException('Công thức có vật tư đóng gói không hợp lệ');
      }
      recipe.approvalStatus = 'CONFIRMED';
      await manager.save(ProductSizeRecipeEntity, recipe);
      return { productId, productName: product.name, size, approvalStatus: recipe.approvalStatus };
    });
  }

  async replacePackagingRecipe(
    productId: number,
    size: 'S' | 'M' | 'L',
    items: Array<{
      ingredientId: string;
      usageType: 'PER_SERVING' | 'PER_ORDER' | 'PER_GROUP';
      quantityRequired: number;
      servingsPerUnit?: number;
    }>,
  ) {
    const product = this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.dataSource.transaction(async (manager) => {
      if (items.length) {
        const ids = [...new Set(items.map((item) => item.ingredientId))];
        const found = await manager.find(IngredientEntity, { where: { id: In(ids) } });
        if (found.length !== ids.length || found.some((ingredient) =>
          ingredient.kind !== 'PACKAGING' || !ingredient.isActive ||
          !ingredient.compatibleSizes.includes(size) || isCupPackaging(ingredient),
        )) {
          throw new BadRequestException('Vật tư không hợp lệ hoặc không tương thích; ly theo size được dùng tự động từ kho chung');
        }
      }
      await manager.delete(ProductPackagingRecipeEntity, { productId, size });
      if (items.length) {
        await manager.save(ProductPackagingRecipeEntity, items.map((item) => ({
          ...item,
          servingsPerUnit: item.usageType === 'PER_GROUP' ? (item.servingsPerUnit ?? 1) : 1,
          productId,
          size,
        })));
      }
      return { productId, productName: product.name, size, items };
    });
  }

  async findToppings(staff = false, productId?: number, size?: 'S' | 'M' | 'L') {
    if (!staff) {
      if (productId === undefined || size === undefined) return [];
      return this.findToppingsForProduct(productId, size);
    }
    const toppings = await this.dataSource.manager.find(ToppingEntity, {
      relations: { ingredient: true },
      order: { name: 'ASC' },
    });
    return toppings.map((topping) => {
      const configured = Boolean(topping.ingredientId && topping.portionQuantityRequired);
      return {
        id: topping.id,
        name: topping.name,
        surcharge: topping.surcharge,
        portionQuantityRequired: topping.portionQuantityRequired,
        availablePortions: topping.ingredient && topping.portionQuantityRequired
          ? Math.floor(topping.ingredient.stock / topping.portionQuantityRequired)
          : null,
        configured,
        available: topping.isActive && configured &&
          (topping.ingredient?.stock ?? 0) >= (topping.portionQuantityRequired ?? Number.MAX_SAFE_INTEGER),
        ...(staff ? {
          ingredientId: topping.ingredientId,
          ingredientName: topping.ingredient?.name ?? null,
          ingredientUnit: topping.ingredient?.unit ?? null,
          ingredientStock: topping.ingredient?.stock ?? null,
          ingredientWarningThreshold: topping.ingredient?.warningThreshold ?? null,
          ingredientLowStock: topping.ingredient
            ? topping.ingredient.stock <= topping.ingredient.warningThreshold
            : null,
          isActive: topping.isActive,
        } : {}),
      };
    });
  }

  async createTopping(dto: {
    id: string;
    name: string;
    surcharge: number;
    ingredientId?: string | null;
    portionQuantityRequired?: number | null;
    isActive?: boolean;
  }) {
    const ingredientId = dto.ingredientId ?? null;
    if (ingredientId) {
      const ingredient = await this.dataSource.manager.findOne(IngredientEntity, {
        where: { id: ingredientId },
      });
      if (!ingredient || ingredient.kind !== 'INGREDIENT' || !ingredient.isActive) {
        throw new BadRequestException('Topping phải liên kết với nguyên liệu đang hoạt động');
      }
    }
    if (dto.isActive && (!ingredientId || !dto.portionQuantityRequired)) {
      throw new BadRequestException('Topping đang bán cần nguyên liệu kho và định lượng mỗi phần');
    }
    try {
      return await this.dataSource.manager.save(ToppingEntity, {
        id: dto.id.trim().toLowerCase(),
        name: dto.name.trim(),
        surcharge: dto.surcharge,
        ingredientId,
        portionQuantityRequired: dto.portionQuantityRequired ?? null,
        isActive: dto.isActive ?? false,
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        typeof error.driverError === 'object' &&
        error.driverError !== null &&
        'code' in error.driverError &&
        error.driverError.code === '23505'
      ) {
        throw new ConflictException('Mã topping đã tồn tại');
      }
      throw error;
    }
  }

  async updateTopping(id: string, dto: {
    name?: string;
    surcharge?: number;
    ingredientId?: string | null;
    isActive?: boolean;
    portionQuantityRequired?: number | null;
  }) {
    const topping = await this.dataSource.manager.findOne(ToppingEntity, { where: { id } });
    if (!topping) throw new NotFoundException('Không tìm thấy topping');
    const ingredientId = dto.ingredientId === undefined ? topping.ingredientId : dto.ingredientId;
    const isActive = dto.isActive ?? topping.isActive;
    if (ingredientId) {
      const ingredient = await this.dataSource.manager.findOne(IngredientEntity, {
        where: { id: ingredientId },
      });
      if (!ingredient || ingredient.kind !== 'INGREDIENT' || !ingredient.isActive) {
        throw new BadRequestException('Topping phải liên kết với nguyên liệu đang hoạt động');
      }
    }
    const portionQuantityRequired = dto.portionQuantityRequired === undefined
      ? topping.portionQuantityRequired
      : dto.portionQuantityRequired;
    if (isActive && !ingredientId) {
      throw new BadRequestException('Topping đang bán cần liên kết nguyên liệu kho');
    }
    if (isActive && !portionQuantityRequired) {
      throw new BadRequestException('Topping đang bán cần định lượng mỗi phần');
    }
    if (dto.name !== undefined) topping.name = dto.name.trim();
    if (dto.surcharge !== undefined) topping.surcharge = dto.surcharge;
    topping.ingredientId = ingredientId;
    topping.isActive = isActive;
    topping.portionQuantityRequired = portionQuantityRequired;
    return this.dataSource.manager.save(ToppingEntity, topping);
  }

  async findToppingsForProduct(_productId: number, _size: 'S' | 'M' | 'L') {
    const toppings = await this.dataSource.manager.find(ToppingEntity, {
      relations: { ingredient: true },
      order: { id: 'ASC' },
    });
    return toppings.map((topping) => {
      const ingredient = topping.ingredient;
      const portionQuantity = topping.portionQuantityRequired;
      const configured = Boolean(
        ingredient?.isActive && ingredient.kind === 'INGREDIENT' && portionQuantity,
      );
      const availablePortions = configured && topping.isActive
        ? Math.floor(ingredient!.stock / portionQuantity!)
        : 0;
      return {
        id: topping.id,
        name: topping.name,
        surcharge: topping.surcharge,
        maxPortions: availablePortions,
        portionQuantityRequired: portionQuantity,
        ingredientUnit: ingredient?.unit ?? null,
        availablePortions,
        configured,
        available: topping.isActive && availablePortions > 0,
      };
    });
  }

  async replaceProductToppings(
    productId: number,
    size: 'S' | 'M' | 'L',
    items: Array<{ toppingId: string; quantityRequired?: number; maxPortions: number }>,
  ) {
    const product = this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.dataSource.transaction(async (manager) => {
      if (items.length) {
        const ids = [...new Set(items.map((item) => item.toppingId))];
        const toppings = await manager.find(ToppingEntity, { where: { id: In(ids) }, relations: { ingredient: true } });
        if (toppings.length !== ids.length || toppings.some((topping) =>
          !topping.isActive || !topping.portionQuantityRequired ||
          !topping.ingredient?.isActive || topping.ingredient.kind !== 'INGREDIENT',
        )) {
          throw new BadRequestException('Chỉ cấu hình topping đang bật, liên kết kho và có định lượng phần');
        }
      }
      await manager.delete(ProductToppingRecipeEntity, { productId, size });
      if (items.length) {
        await manager.save(ProductToppingRecipeEntity, items.map((item) => ({
          ...item,
          productId,
          size,
        })));
      }
      return { productId, productName: product.name, size, items };
    });
  }

  async checkOrderAvailability(
    manager: EntityManager,
    lines: OrderInventoryLine[],
  ): Promise<InventoryCheckResult> {
    const result = await this.getOrderRequirements(manager, lines);
    const shortages: InventoryShortage[] = [];
    for (const { ingredient, quantity } of result.requirements.values()) {
      if (ingredient.stock < quantity) shortages.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: ingredient.unit,
        required: quantity,
        available: ingredient.stock,
      });
    }
    return {
      available: !result.unconfiguredProducts.length &&
        !result.unconfiguredSizes.length &&
        !result.unconfiguredToppings.length &&
      !result.unconfiguredPackaging.length &&
      !shortages.length,
      shortages,
      unconfiguredProducts: result.unconfiguredProducts,
      unconfiguredSizes: result.unconfiguredSizes,
      unconfiguredToppings: result.unconfiguredToppings,
      unconfiguredPackaging: result.unconfiguredPackaging,
    };
  }

  async reserveOrderItems(manager: EntityManager, lines: OrderInventoryLine[]) {
    const result = await this.getOrderRequirements(manager, lines);
    if (result.unconfiguredProducts.length || result.unconfiguredSizes.length) {
      throw new BadRequestException('Chưa cấu hình công thức cho một hoặc nhiều món trong đơn');
    }
    if (result.unconfiguredToppings.length) {
      throw new BadRequestException('Một hoặc nhiều topping chưa được cấu hình tồn kho');
    }
    if (result.unconfiguredPackaging.length) {
      throw new BadRequestException('Một hoặc nhiều vật tư đóng gói không còn khả dụng');
    }
    const snapshots: ReservedIngredient[] = [];
    for (const [ingredientId, { ingredient, quantity }] of [...result.requirements].sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      await this.changeStock(manager, ingredientId, quantity, 'consume');
      snapshots.push({
        ingredientId,
        ingredientName: ingredient.name,
        ingredientCode: ingredient.code,
        ingredientUnit: ingredient.unit,
        quantity,
      });
    }
    return snapshots;
  }

  private async getOrderRequirements(manager: EntityManager, lines: OrderInventoryLine[]) {
    const productIds = [...new Set(lines.map((line) => line.productId))];
    const [sizeRecipes, sizeItems, packagingRules, toppings, cupInventory] = await Promise.all([
      manager.find(ProductSizeRecipeEntity, { where: { productId: In(productIds) } }),
      manager.find(ProductSizeRecipeItemEntity, {
        where: { productId: In(productIds) },
        relations: { ingredient: true },
      }),
      manager.find(ProductPackagingRecipeEntity, {
        where: { productId: In(productIds) },
        relations: { ingredient: true },
      }),
      manager.find(ToppingEntity, { relations: { ingredient: true } }),
      manager.find(IngredientEntity, { where: { kind: 'PACKAGING' } }),
    ]);
    const requirements = new Map<string, IngredientRequirement>();
    const unconfiguredSizes: Array<{ productId: number; size: 'S' | 'M' | 'L' }> = [];
    const unconfiguredToppings = new Set<string>();
    const unconfiguredPackaging = new Set<string>();
    const add = (ingredient: IngredientEntity, amount: number) => {
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > 2_147_483_647) {
        throw new BadRequestException('Định lượng nguyên liệu vượt quá giới hạn');
      }
      const previous = requirements.get(ingredient.id);
      const total = (previous?.quantity ?? 0) + amount;
      if (!Number.isSafeInteger(total) || total > 2_147_483_647) {
        throw new BadRequestException('Định lượng nguyên liệu vượt quá giới hạn');
      }
      requirements.set(ingredient.id, { ingredient, quantity: total });
    };

    for (const line of lines) {
      const configuredSize = sizeRecipes.some((recipe) =>
        recipe.productId === line.productId && recipe.size === line.size &&
        recipe.approvalStatus === 'CONFIRMED',
      );
      const recipeLines = configuredSize
        ? sizeItems.filter((item) => item.productId === line.productId && item.size === line.size)
        : [];
      if (!recipeLines.length || recipeLines.some((item) =>
        item.ingredient.kind !== 'INGREDIENT' || !item.ingredient.isActive,
      )) {
        unconfiguredSizes.push({ productId: line.productId, size: line.size });
      } else {
        for (const item of recipeLines) add(item.ingredient, item.quantityRequired * line.quantity);
      }

      for (const selected of line.toppings ?? []) {
        const topping = toppings.find((item) => item.id === selected.id);
        if (!topping?.isActive || !topping.portionQuantityRequired || !topping.ingredient ||
            !topping.ingredient.isActive || topping.ingredient.kind !== 'INGREDIENT' ||
            !Number.isInteger(selected.quantity) || selected.quantity < 1) {
          unconfiguredToppings.add(selected.id);
          continue;
        }
        add(
          topping.ingredient,
          topping.portionQuantityRequired * selected.quantity * line.quantity,
        );
      }
    }

    const perOrderPackages = new Map<string, { ingredient: IngredientEntity; quantity: number }>();
    const perGroupPackages = new Map<string, {
      ingredient: IngredientEntity;
      quantityRequired: number;
      servingsPerUnit: number;
      servings: number;
    }>();
    for (const line of lines) {
      const cups = cupInventory.filter((ingredient) =>
        isCupPackaging(ingredient) && ingredient.compatibleSizes.includes(line.size),
      );
      if (cups.length !== 1 || !cups[0].isActive) {
        unconfiguredPackaging.add(cups.map((cup) => cup.id).join(',') || `CUP_${line.size}`);
      } else {
        add(cups[0], line.quantity);
      }

      for (const rule of packagingRules.filter((item) =>
        item.productId === line.productId && item.size === line.size,
      )) {
        if (isCupPackaging(rule.ingredient)) continue;
        if (!rule.ingredient.isActive || rule.ingredient.kind !== 'PACKAGING' ||
            !rule.ingredient.compatibleSizes.includes(rule.size)) {
          unconfiguredPackaging.add(rule.ingredientId);
          continue;
        }
        if (rule.usageType === 'PER_SERVING') {
          add(rule.ingredient, line.quantity * rule.quantityRequired);
        } else if (rule.usageType === 'PER_ORDER') {
          const current = perOrderPackages.get(rule.ingredientId);
          perOrderPackages.set(rule.ingredientId, {
            ingredient: rule.ingredient,
            quantity: Math.max(current?.quantity ?? 0, rule.quantityRequired),
          });
        } else {
          const key = `${rule.ingredientId}:${rule.quantityRequired}:${rule.servingsPerUnit}`;
          const current = perGroupPackages.get(key);
          perGroupPackages.set(key, {
            ingredient: rule.ingredient,
            quantityRequired: rule.quantityRequired,
            servingsPerUnit: rule.servingsPerUnit,
            servings: (current?.servings ?? 0) + line.quantity,
          });
        }
      }
    }
    for (const { ingredient, quantity } of perOrderPackages.values()) add(ingredient, quantity);
    for (const { ingredient, quantityRequired, servingsPerUnit, servings } of perGroupPackages.values()) {
      add(ingredient, Math.ceil(servings / servingsPerUnit) * quantityRequired);
    }
    return {
      requirements,
      unconfiguredProducts: [],
      unconfiguredSizes,
      unconfiguredToppings: [...unconfiguredToppings],
      unconfiguredPackaging: [...unconfiguredPackaging],
    };
  }

  async replaceRecipe(productId: number, items: Array<{ ingredientId: string; quantityRequired: number }>) {
    const product = this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.dataSource.transaction(async (manager) => {
      if (items.length) {
        const ingredientIds = [...new Set(items.map((item) => item.ingredientId))];
        const found = await manager.find(IngredientEntity, { where: { id: In(ingredientIds) } });
        if (found.length !== ingredientIds.length || found.some((ingredient) =>
          ingredient.kind !== 'INGREDIENT' || !ingredient.isActive,
        )) {
          throw new BadRequestException('Công thức chứa nguyên liệu không hợp lệ');
        }
      }
      await manager.delete(IngredientRecipeEntity, { productId });
      if (items.length) {
        await manager.save(
          IngredientRecipeEntity,
          items.map((item) => ({ ...item, productId })),
        );
      }
      return {
        productId,
        productName: product.name,
        items: await manager.find(IngredientRecipeEntity, {
          where: { productId },
          relations: { ingredient: true },
        }).then((recipes) => recipes.map((recipe) => ({
          ingredientId: recipe.ingredientId,
          ingredientName: recipe.ingredient.name,
          unit: recipe.ingredient.unit,
          quantityRequired: recipe.quantityRequired,
        }))),
      };
    });
  }

  async checkAvailability(
    manager: EntityManager,
    productQuantities: Map<number, number>,
  ): Promise<InventoryCheckResult> {
    const { requirements, unconfiguredProducts } = await this.getRequirements(
      manager,
      productQuantities,
    );
    const shortages: InventoryShortage[] = [];
    for (const { ingredient, quantity } of requirements.values()) {
      if (ingredient.stock < quantity) {
        shortages.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          required: quantity,
          available: ingredient.stock,
        });
      }
    }
    return {
      available: unconfiguredProducts.length === 0 && shortages.length === 0,
      shortages,
      unconfiguredProducts,
    };
  }

  async reserveForOrder(manager: EntityManager, productQuantities: Map<number, number>) {
    const { requirements, unconfiguredProducts } = await this.getRequirements(
      manager,
      productQuantities,
    );
    if (unconfiguredProducts.length > 0) {
      throw new BadRequestException(
        `Chưa cấu hình công thức nguyên liệu cho sản phẩm ${unconfiguredProducts.join(', ')}`,
      );
    }

    const snapshots: ReservedIngredient[] = [];
    for (const [ingredientId, { ingredient, quantity }] of [...requirements].sort(
      ([a], [b]) => a.localeCompare(b),
    )) {
      await this.changeStock(manager, ingredientId, quantity, 'consume');
      snapshots.push({
        ingredientId,
        ingredientName: ingredient.name,
        ingredientCode: ingredient.code,
        ingredientUnit: ingredient.unit,
        quantity,
      });
    }
    return snapshots;
  }

  private async getRequirements(
    manager: EntityManager,
    productQuantities: Map<number, number>,
  ): Promise<{
    requirements: Map<string, IngredientRequirement>;
    unconfiguredProducts: number[];
  }> {
    const recipes = await manager.find(IngredientRecipeEntity, {
      where: { productId: In([...productQuantities.keys()]) },
      relations: { ingredient: true },
    });
    const configuredProducts = new Set(recipes.map((recipe) => recipe.productId));
    const unconfiguredProducts = [...productQuantities.keys()].filter(
      (productId) => !configuredProducts.has(productId),
    );
    const requirements = new Map<string, IngredientRequirement>();
    for (const recipe of recipes) {
      const quantity = recipe.quantityRequired * (productQuantities.get(recipe.productId) ?? 0);
      const current = requirements.get(recipe.ingredientId);
      const totalQuantity = (current?.quantity ?? 0) + quantity;
      if (!Number.isSafeInteger(totalQuantity) || totalQuantity > 2_147_483_647) {
        throw new BadRequestException('Định lượng nguyên liệu vượt quá giới hạn');
      }
      requirements.set(recipe.ingredientId, {
        ingredient: recipe.ingredient,
        quantity: totalQuantity,
      });
    }

    return { requirements, unconfiguredProducts };
  }

  async saveOrderConsumption(manager: EntityManager, orderId: string, snapshots: ReservedIngredient[]) {
    if (!snapshots.length) return;
    await manager.save(
      OrderIngredientConsumptionEntity,
      snapshots.map((snapshot) => ({ ...snapshot, orderId })),
    );
  }

  async releaseOrderConsumption(manager: EntityManager, orderId: string) {
    const consumptions = await manager.find(OrderIngredientConsumptionEntity, {
      where: { orderId },
      order: { ingredientId: 'ASC' },
    });
    for (const consumption of consumptions) {
      await this.changeStock(
        manager,
        consumption.ingredientId,
        consumption.quantity,
        'release',
      );
    }
  }

  private async changeStock(
    manager: EntityManager,
    ingredientId: string,
    quantity: number,
    action: 'consume' | 'release',
  ) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ingredient = await manager.findOne(IngredientEntity, {
        where: { id: ingredientId },
      });
      if (!ingredient) throw new NotFoundException('Không tìm thấy nguyên liệu trong công thức');
      if (action === 'consume' && ingredient.stock < quantity) {
        throw new ConflictException(`Nguyên liệu ${ingredient.name} không đủ tồn kho`);
      }

      const stockExpression = action === 'consume' ? '"stock" - $1' : '"stock" + $1';
      const result: unknown = await manager.query(
        `UPDATE "ingredients"
         SET "stock" = ${stockExpression}, "version" = "version" + 1
         WHERE "id" = $2 AND "version" = $3
           AND ($4::boolean = false OR "stock" >= $1)
         RETURNING "stock", "version"`,
        [quantity, ingredientId, ingredient.version, action === 'consume'],
      );
      const rows = normalizeRows<IngredientStockRow>(result);
      if (rows.length === 1) return;
    }
    throw new ConflictException('Tồn nguyên liệu vừa thay đổi; vui lòng thử lại');
  }
}

function normalizeRows<T>(result: unknown): T[] {
  if (!Array.isArray(result)) return [];
  if (result.length === 2 && Array.isArray(result[0])) return result[0] as T[];
  return result as T[];
}
