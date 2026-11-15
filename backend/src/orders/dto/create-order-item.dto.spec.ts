import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './create-order-item.dto';

describe('CreateOrderDto', () => {
  const validOrder = {
    items: [{ productId: 1, size: 'M', toppings: ['pearls'], quantity: 2 }],
  };

  it('accepts a valid cart payload', async () => {
    const dto = plainToInstance(CreateOrderDto, validOrder);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([
    ['empty cart', { items: [] }],
    ['zero quantity', { items: [{ productId: 1, size: 'M', quantity: 0 }] }],
    ['negative quantity', { items: [{ productId: 1, size: 'M', quantity: -1 }] }],
    ['invalid size', { items: [{ productId: 1, size: 'XL', quantity: 1 }] }],
    ['unknown topping', { items: [{ productId: 1, size: 'M', toppings: ['unknown'], quantity: 1 }] }],
    ['malformed toppings', { items: [{ productId: 1, size: 'M', toppings: {}, quantity: 1 }] }],
    ['duplicate toppings', { items: [{ productId: 1, size: 'M', toppings: ['pearls', 'pearls'], quantity: 1 }] }],
    ['invalid product ID', { items: [{ productId: 0, size: 'M', quantity: 1 }] }],
    ['unexpected client price', { items: [{ productId: 1, size: 'M', quantity: 1, unitPrice: 1 }] }],
  ])('rejects %s', async (_label, payload) => {
    const dto = plainToInstance(CreateOrderDto, payload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
