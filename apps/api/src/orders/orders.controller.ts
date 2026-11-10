import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order-item.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { StaffGuard } from './guards/staff.guard';
import { OrdersService } from './orders.service';
import { StaffOrderQueryDto } from './dto/staff-order-query.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.ordersService.findMine(request.user.id);
  }

  @Get('staff/queue')
  @UseGuards(JwtAuthGuard, StaffGuard)
  staffQueue(@Query() query: StaffOrderQueryDto) {
    return this.ordersService.findStaffQueue(query);
  }

  @Get('staff/summary')
  @UseGuards(JwtAuthGuard, StaffGuard)
  staffSummary() {
    return this.ordersService.getStaffSummary();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.findOneForUser(id, request.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateOrderDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.create(dto, request.user.id);
  }

  @Post('preview')
  @UseGuards(JwtAuthGuard)
  preview(@Body() dto: CreateOrderDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.preview(dto, request.user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.cancelForUser(id, request.user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, StaffGuard)
  changeStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeOrderStatusDto,
  ) {
    return this.ordersService.changeStatusByStaff(id, dto.status);
  }
}
