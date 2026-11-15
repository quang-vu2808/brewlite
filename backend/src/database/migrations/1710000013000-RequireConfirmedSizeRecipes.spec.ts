import { RequireConfirmedSizeRecipes1710000013000 } from './1710000013000-RequireConfirmedSizeRecipes';

describe('RequireConfirmedSizeRecipes1710000013000', () => {
  it('adds a fail-closed approval status without changing recipe quantities', async () => {
    const query = jest.fn().mockResolvedValue(undefined);

    await new RequireConfirmedSizeRecipes1710000013000().up({ query } as never);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("DEFAULT 'PENDING'");
    expect(query.mock.calls[0][0]).toContain("CHECK (\"approval_status\" IN ('PENDING', 'CONFIRMED'))");
    expect(query.mock.calls[0][0]).not.toContain('UPDATE "product_size_recipe_items"');
    expect(query.mock.calls[0][0]).not.toContain('"stock"');
  });

  it('refuses rollback that could silently reactivate unconfirmed recipes', async () => {
    await expect(new RequireConfirmedSizeRecipes1710000013000().down()).rejects.toThrow(
      'removing the approval gate could reactivate unconfirmed recipes',
    );
  });
});
