import { IMenu, IOrder } from '../types/index';

export type OrderLineItem = {
  name: string;
  qty: number;
  price: number;
  isCustomization: boolean;
};

/** Shown when the order's menu item has been deleted since it was placed. */
export const REMOVED_ITEM_LABEL = 'Item no longer on the menu';

const menuIsResolvable = (menu?: IMenu | null): boolean =>
  !!menu && (menu.title != null || menu.price != null);

/**
 * The line items for an order, shared by the customer and chef order screens.
 *
 * getOrderData resolves the menu by id at read time, so a chef deleting or
 * replacing an item leaves older orders pointing at nothing — roughly 6% of
 * production orders are already in that state. Both screens read `menu.title`
 * and `menu.price` directly, which rendered a blank name at $0.00 underneath a
 * real order total.
 *
 * When the menu is gone the order's own recorded money is used instead, so the
 * line still adds up to what was actually charged.
 */
export const buildOrderItems = (
  order?: IOrder | null,
  menu?: IMenu | null,
): OrderLineItem[] => {
  const qty = Number(order?.amount ?? 0);

  if (!menuIsResolvable(menu)) {
    const subtotal = Number(
      (order as any)?.subtotal_before_discount ?? order?.total_price ?? 0,
    );
    return [
      { name: REMOVED_ITEM_LABEL, qty, price: subtotal, isCustomization: false },
    ];
  }

  const items: OrderLineItem[] = [
    {
      name: menu?.title ?? REMOVED_ITEM_LABEL,
      qty,
      price: (menu?.price ?? 0) * qty,
      isCustomization: false,
    },
  ];

  // Add-ons arrive as a CSV of customization ids; repeats collapse into one
  // line with the quantity and price accumulated.
  order?.addons?.split(',').forEach(addon => {
    const customize = menu?.customizations?.find(x => x.id == parseInt(addon));
    if (!customize) return;

    const sameIndex = items.findIndex(x => x.name == customize.name);
    if (sameIndex === -1) {
      items.push({
        name: customize.name ?? '',
        qty: 1,
        price: customize.upcharge_price ?? 0,
        isCustomization: true,
      });
    } else {
      items[sameIndex].qty++;
      items[sameIndex].price += customize.upcharge_price ?? 0;
    }
  });

  return items;
};
