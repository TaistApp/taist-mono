import { IMenu, IOrder } from '../../app/types/index';
import { REMOVED_ITEM_LABEL, buildOrderItems } from '../../app/utils/orderItems';

const menu = {
  title: 'Meatball Subs',
  price: 25.375,
  customizations: [
    { id: 7, name: 'Spicy Marinara', upcharge_price: 2 },
    { id: 9, name: 'Extra Cheese', upcharge_price: 1.5 },
  ],
} as unknown as IMenu;

const order = (o: Partial<IOrder> = {}): IOrder =>
  ({ amount: 2, total_price: 35.53, ...o } as IOrder);

/**
 * Both order screens read menu.title and menu.price directly, but getOrderData
 * resolves the menu by id at read time — so an item deleted after the order was
 * placed left a blank name priced at $0.00 sitting under a real order total.
 * Roughly 6% of production orders already point at a menu row that is gone.
 */
describe('order line items', () => {
  it('prices the item from the menu when it still exists', () => {
    const [line] = buildOrderItems(order(), menu);

    expect(line.name).toBe('Meatball Subs');
    expect(line.qty).toBe(2);
    expect(line.price).toBeCloseTo(50.75);
  });

  it('falls back to what was charged when the menu item is gone', () => {
    const [line] = buildOrderItems(
      order({ total_price: 35.53 }),
      undefined,
    );

    expect(line.name).toBe(REMOVED_ITEM_LABEL);
    expect(line.price).toBe(35.53);
    expect(line.qty).toBe(2);
  });

  it('never reports a blank name or $0.00 against a real total', () => {
    for (const missing of [undefined, null, {} as IMenu]) {
      const [line] = buildOrderItems(order(), missing);

      expect(line.name).toBeTruthy();
      expect(line.price).toBeGreaterThan(0);
    }
  });

  it('prefers the pre-discount subtotal when the order records one', () => {
    const [line] = buildOrderItems(
      order({ total_price: 35.53, subtotal_before_discount: 50.75 } as any),
      null,
    );

    expect(line.price).toBe(50.75);
  });

  it('adds each add-on as its own line', () => {
    const items = buildOrderItems(order({ addons: '7' } as any), menu);

    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ name: 'Spicy Marinara', qty: 1, price: 2 });
  });

  it('collapses a repeated add-on into one accumulated line', () => {
    const items = buildOrderItems(order({ addons: '7,7,9' } as any), menu);

    expect(items).toHaveLength(3);
    expect(items[1]).toMatchObject({ name: 'Spicy Marinara', qty: 2, price: 4 });
    expect(items[2]).toMatchObject({ name: 'Extra Cheese', qty: 1, price: 1.5 });
  });

  // Control: an add-on id the menu no longer offers is skipped rather than
  // rendering an empty row.
  it('skips add-ons the menu no longer has', () => {
    const items = buildOrderItems(order({ addons: '7,999' } as any), menu);

    expect(items).toHaveLength(2);
    expect(items.every(i => !!i.name)).toBe(true);
  });
});
