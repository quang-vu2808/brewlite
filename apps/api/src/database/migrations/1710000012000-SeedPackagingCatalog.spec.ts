import { SeedPackagingCatalog1710000012000 } from './1710000012000-SeedPackagingCatalog';

describe('SeedPackagingCatalog1710000012000', () => {
  it('creates missing catalog entries without creating opening stock or adjustment history', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const migration = new SeedPackagingCatalog1710000012000();

    await migration.up({ query } as never);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("('CUP_S', 'Ly size S', 'CUP'");
    expect(query.mock.calls[0][0]).toContain("('CUP_M', 'Ly size M', 'CUP'");
    expect(query.mock.calls[0][0]).toContain("('CUP_L', 'Ly size L', 'CUP'");
    expect(query.mock.calls[0][0]).toContain("'Nắp ly (chung)'");
    expect(query.mock.calls[0][0]).toContain("'Ống hút (chung)'");
    expect(query.mock.calls[0][0]).toContain("'Bịch đựng đồ uống (chung)'");
    expect(query.mock.calls[0][0]).toContain("'cái', 0, 0, 'PACKAGING'");
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT ("code") DO NOTHING');
    expect(query.mock.calls[0][0]).not.toContain('ingredient_adjustments');
  });

  it('refuses to delete catalog records on rollback', async () => {
    await expect(new SeedPackagingCatalog1710000012000().down()).rejects.toThrow(
      'Refusing to delete packaging catalog records',
    );
  });
});
