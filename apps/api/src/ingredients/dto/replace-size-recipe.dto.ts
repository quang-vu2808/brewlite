import { IsIn } from 'class-validator';
import { ReplaceProductRecipeDto } from './replace-product-recipe.dto';

export class ReplaceSizeRecipeDto extends ReplaceProductRecipeDto {
  @IsIn(['S', 'M', 'L'])
  size!: 'S' | 'M' | 'L';
}
