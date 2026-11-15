import { IsIn } from 'class-validator';

export class ChangeOrderStatusDto {
  @IsIn(['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])
  status!: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
}
