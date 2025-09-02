import { query } from '../config/database.js';
import { logger } from '../utils/logger.js';

const seedProducts = async () => {
  try {
    logger.info('🌱 Starting product seeding...');

    // Ice Cream Products
    const iceCreamProducts = [
      'Wafel Hoorntjes',
      'Kinder Hoorntjes', 
      'Luxe Hoorn nootjes',
      'Luxe Hoorn Spikkel',
      'Bakje 1 bol',
      'Bakje 2 bollen',
      'Bakje ¾ Bollen',
      'Lepeltjes',
      '0,5L bak',
      '1L bak'
    ];

    // Drinks Products (formerly Coffee)
    const drinksProducts = [
      'Oatly Barista Hafer Oat',
      'Alpro Soya',
      'Alpro Barista Almond',
      'Alpro Barista Coconut',
      'Alpro Barista Oat',
      '7-up',
      'Red Bull',
      'Spa Blauw',
      'AH Volle Melk',
      'Monin Strawberry',
      'Monin Vanilla',
      'Monin Caramel',
      'Monin Hazelnut',
      'Monin White Chocolate',
      'Monin Bubblegum',
      'Monin Lime',
      'Monin Caramel Sugarfree',
      'Monin Vanilla Sugarfree',
      'Giffard Bl'
    ];

    // Kitchen Products
    const kitchenProducts = [
      'Spanish 10L',
      'Pistache 10L',
      'Strawberry 10L',
      'Mango 10L',
      'Slagroom 2x',
      'Nestle Cacao Poeder',
      'Callebaut Cacao Korrels',
      'Matcha',
      'Finest Call Mango Siroop',
      'Lotus Saus 6 bottles',
      'Lotus Kruimels',
      'Oreo Kruimels',
      'Monin Chocolate saus'
    ];

    // Non-Kitchen Products
    const nonKitchenProducts = [
      'Kleine Tasjes',
      'Grote Tasjes',
      'Kassabon Rollen',
      'Bekerhouders 2',
      'Bekerhouders 4',
      'Torkrollen box',
      'Servetten box',
      'Rietjes box',
      'Milkshake rietjes box',
      'Latte Macchiato 12oz',
      'Cappuccino 8oz',
      'Flat White 7,5oz',
      'Espresso 4oz',
      'Iced Deksel',
      'Dreft',
      'Glorix',
      'Super Finn',
      'Dubro Ontkalker',
      'Andy Allesreiniger',
      'Handschoenen S/L/XL',
      'Dettol',
      'Desinfectie spray',
      'Sopdoeken'
    ];

    // Generate product codes
    const generateCode = (type, index) => {
      const prefix = type === 'ice-cream' ? 'IC' : 
                     type === 'drinks' ? 'DR' : 
                     type === 'kitchen' ? 'KT' : 'NK';
      return `${prefix}${String(index + 1).padStart(4, '0')}`;
    };

    // Insert Ice Cream Products
    for (let i = 0; i < iceCreamProducts.length; i++) {
      const code = generateCode('ice-cream', i);
      await query(`
        INSERT INTO products (code, name, type, category, production_date, quantity)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO NOTHING
      `, [code, iceCreamProducts[i], 'ice-cream', 'Ice Cream', new Date().toISOString().split('T')[0], 0]);

      // Also add to inventory
      await query(`
        INSERT INTO inventory (name, code, type, quantity, expiry_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO NOTHING
      `, [iceCreamProducts[i], code, 'ice-cream', 0, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);
    }

    // Insert Drinks Products
    for (let i = 0; i < drinksProducts.length; i++) {
      const code = generateCode('drinks', i);
      await query(`
        INSERT INTO products (code, name, type, category, production_date, quantity)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO NOTHING
      `, [code, drinksProducts[i], 'drinks', 'Drinks', new Date().toISOString().split('T')[0], 0]);

      // Also add to inventory
      await query(`
        INSERT INTO inventory (name, code, type, quantity, expiry_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO NOTHING
      `, [drinksProducts[i], code, 'drinks', 0, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);
    }

    // Insert Kitchen Products
    for (let i = 0; i < kitchenProducts.length; i++) {
      const code = generateCode('kitchen', i);
      await query(`
        INSERT INTO products (code, name, type, category, production_date, quantity)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO NOTHING
      `, [code, kitchenProducts[i], 'kitchen', 'Kitchen Supplies', new Date().toISOString().split('T')[0], 0]);

      // Also add to inventory
      await query(`
        INSERT INTO inventory (name, code, type, quantity, expiry_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO NOTHING
      `, [kitchenProducts[i], code, 'kitchen', 0, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);
    }

    // Insert Non-Kitchen Products
    for (let i = 0; i < nonKitchenProducts.length; i++) {
      const code = generateCode('non-kitchen', i);
      await query(`
        INSERT INTO products (code, name, type, category, production_date, quantity)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO NOTHING
      `, [code, nonKitchenProducts[i], 'non-kitchen', 'Non-Kitchen Supplies', new Date().toISOString().split('T')[0], 0]);

      // Also add to inventory
      await query(`
        INSERT INTO inventory (name, code, type, quantity, expiry_date)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO NOTHING
      `, [nonKitchenProducts[i], code, 'non-kitchen', 0, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]);
    }

    logger.info('✅ Product seeding completed successfully');
    logger.info(`📦 Added ${iceCreamProducts.length} ice cream products`);
    logger.info(`🥤 Added ${drinksProducts.length} drinks products`);
    logger.info(`🍴 Added ${kitchenProducts.length} kitchen products`);
    logger.info(`📋 Added ${nonKitchenProducts.length} non-kitchen products`);

  } catch (error) {
    logger.error('❌ Product seeding failed:', error);
    throw error;
  }
};

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProducts()
    .then(() => {
      logger.info('🎉 Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Seeding script failed:', error);
      process.exit(1);
    });
}

export { seedProducts };