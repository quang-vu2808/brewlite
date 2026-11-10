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

type IngredientStockRow = { stock: number; version: number };
type ReservedIngredient = {
  ingredientId: string;
  ingredientName: string;
  ingredientCode: string;
  ingredientUnit: string;
  quantity: number;
};

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
    }));
  }

  async create(dto: CreateIngredientDto) {
    try {
      return await this.dataSource.manager.save(IngredientEntity, {
        stock: dto.stock,
        warningThreshold: dto.warningThreshold,
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        unit: dto.unit.trim(),
        version: 1,
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
      const update = {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
        ...(dto.warningThreshold !== undefined ? { warningThreshold: dto.warningThreshold } : {}),
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
    const adjustments = await this.dataSource.manager.find(IngredientAdjustmentEntity, {
      where: { ingredientId },
      relations: { staffUser: true },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return adjustments.map((adjustment) => ({
      id: adjustment.id,
      delta: adjustment.delta,
      reason: adjustment.reason,
      createdAt: adjustment.createdAt,
      staffEmail: adjustment.staffUser.email,
    }));
  }

  async listRecipes() {
    const products = this.productsService.findAll();
    const recipes = await this.dataSource.manager.find(IngredientRecipeEntity, {
      relations: { ingredient: true },
      order: { productId: 'ASC' },
    });
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
    }));
  }

  async replaceRecipe(productId: number, items: Array<{ ingredientId: string; quantityRequired: number }>) {
    const product = this.productsService.findOne(productId);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.dataSource.transaction(async (manager) => {
      if (items.length) {
        const ingredientIds = [...new Set(items.map((item) => item.ingredientId))];
        const found = await manager.find(IngredientEntity, { where: { id: In(ingredientIds) } });
        if (found.length !== ingredientIds.length) {
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

  async reserveForOrder(manager: EntityManager, productQuantities: Map<number, number>) {
    const recipes = await manager.find(IngredientRecipeEntity, {
      where: { productId: In([...productQuantities.keys()]) },
      relations: { ingredient: true },
    });
    const configuredProducts = new Set(recipes.map((recipe) => recipe.productId));
    for (const productId of productQuantities.keys()) {
      if (!configuredProducts.has(productId)) {
        throw new BadRequestException(
          `Chưa cấu hình công thức nguyên liệu cho sản phẩm ${productId}`,
        );
      }
    }
    const required = new Map<string, { ingredient: IngredientEntity; quantity: number }>();
    for (const recipe of recipes) {
      const quantity = recipe.quantityRequired * (productQuantities.get(recipe.productId) ?? 0);
      const current = required.get(recipe.ingredientId);
      const totalQuantity = (current?.quantity ?? 0) + quantity;
      if (!Number.isSafeInteger(totalQuantity) || totalQuantity > 2_147_483_647) {
        throw new BadRequestException('Định lượng nguyên liệu vượt quá giới hạn');
      }
      required.set(recipe.ingredientId, {
        ingredient: recipe.ingredient,
        quantity: totalQuantity,
      });
    }

    const snapshots: ReservedIngredient[] = [];
    for (const [ingredientId, { ingredient, quantity }] of [...required].sort(([a], [b]) => a.localeCompare(b))) {
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
