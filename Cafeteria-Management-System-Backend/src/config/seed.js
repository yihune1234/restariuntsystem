const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = require('./env');
const logger = require('./logger');
const { User } = require('../modules/users/user.model');
const { Table } = require('../modules/tables/table.model');
const Category = require('../modules/menu/category/category.model');
const FoodItem = require('../modules/menu/food/food.model');
const MealPeriod = require('../modules/menu/meal-period/meal-period.model');

const RESTAURANT_NAME = 'Faarees Kaafee fi Restoorraantii';
const RESTAURANT_NAME_AM = 'ፋሪስ ካፌ እና ሪስቶራንት';

const seedData = async () => {
  try {
    logger.info('=======================================================');
    logger.info(`Seeding database: ${config.mongo.uri}`);
    logger.info('=======================================================');

    await mongoose.connect(config.mongo.uri);
    logger.info('Connected to MongoDB');

    logger.info('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Table.deleteMany({}),
      Category.deleteMany({}),
      FoodItem.deleteMany({}),
      MealPeriod.deleteMany({}),
    ]);

    // Create Staff Users
    logger.info('Creating Staff Users...');
    const defaultPassword = 'Password123!';

    const owner = await User.create({
      name: 'Abebe Bikila (Owner)',
      email: 'owner@habesha.com',
      phone: '+251911223344',
      passwordHash: defaultPassword,
      role: 'OWNER',
      isActive: true,
    });

    const manager = await User.create({
      name: 'Sara Tadesse (Manager)',
      email: 'manager@habesha.com',
      phone: '+251911334455',
      passwordHash: defaultPassword,
      role: 'MANAGER',
      isActive: true,
    });

    const cashier = await User.create({
      name: 'Dawit Kebede (Cashier)',
      email: 'cashier@habesha.com',
      phone: '+251911445566',
      passwordHash: defaultPassword,
      role: 'CASHIER',
      isActive: true,
    });

    const kitchen = await User.create({
      name: 'Chef Solomon (Head Chef)',
      email: 'kitchen@habesha.com',
      phone: '+251911556677',
      passwordHash: defaultPassword,
      role: 'KITCHEN',
      isActive: true,
    });

    // Create Tables
    logger.info('Creating Tables...');
    const tables = [];
    for (let i = 1; i <= 10; i++) {
      const table = await Table.create({
        tableNumber: `T-${String(i).padStart(2, '0')}`,
        qrToken: `faarees_qr_token_table_${String(i).padStart(2, '0')}`,
        capacity: i <= 5 ? 2 : 4,
        status: 'AVAILABLE',
        isActive: true,
      });
      tables.push(table);
    }

    // Create Meal Types
    logger.info('Creating Meal Types...');
    const breakfast = await MealPeriod.create({
      name: 'BREAKFAST',
      nameEn: 'Breakfast',
      startTime: '06:00',
      endTime: '10:30',
      displayOrder: 10,
      isActive: true,
    });

    const lunch = await MealPeriod.create({
      name: 'LUNCH',
      nameEn: 'Lunch',
      startTime: '10:30',
      endTime: '15:00',
      displayOrder: 20,
      isActive: true,
    });

    const dinner = await MealPeriod.create({
      name: 'DINNER',
      nameEn: 'Dinner',
      startTime: '15:00',
      endTime: '22:00',
      displayOrder: 30,
      isActive: true,
    });

    const allDay = await MealPeriod.create({
      name: 'ALL_DAY',
      nameEn: 'All-Day',
      startTime: '00:00',
      endTime: '23:59',
      displayOrder: 40,
      isActive: true,
    });

    const allMealPeriodIds = [breakfast._id, lunch._id, dinner._id];

    // Create Categories
    logger.info('Creating Categories...');
    const categories = {};

        categories.hotDrinks = await Category.create({
      name: 'HOT DRINKS',
      displayOrder: 10,
      mealPeriodIds: allMealPeriodIds,
      isAllDay: true,
      isActive: true,
    });

    categories.foods = await Category.create({
      name: 'FOODS',
      displayOrder: 20,
      mealPeriodIds: allMealPeriodIds,
      isAllDay: true,
      isActive: true,
    });

    categories.softDrinks = await Category.create({
      name: 'SOFT DRINKS & WATER',
      displayOrder: 30,
      mealPeriodIds: allMealPeriodIds,
      isAllDay: true,
      isActive: true,
    });

    categories.meals = await Category.create({
      name: 'MEALS',
      displayOrder: 40,
      mealPeriodIds: allMealPeriodIds,
      isAllDay: true,
      isActive: true,
    });

    categories.snacks = await Category.create({
      name: 'SNACKS & FAST FOOD',
      displayOrder: 50,
      mealPeriodIds: allMealPeriodIds,
      isAllDay: true,
      isActive: true,
    });

    // Create Food Items
    logger.info('Creating Food Items...');
    const foodItems = [];

    // HOT DRINKS (13 items)
    const hotDrinkItems = [
      { name: 'Shaayi Loomii / ሻይ ሎሚ', description: 'Lemon Tea', price: 45, imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 1, isFeatured: true },
      { name: 'Shaayii Burtukaana / ሻይ ብርቱካን', description: 'Orange Tea', price: 45, imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 2 },
      { name: 'Shaayii Anaanasa / ሻይ አናናስ', description: 'Pineapple Tea', price: 45, imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 3 },
      { name: 'Shaayii Maangoo / ሻይ ማንጎ', description: 'Mango Tea', price: 45, imageUrl: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 4 },
      { name: 'Qashar / ቐሸር', description: 'Qashar', price: 45, imageUrl: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 5 },
      { name: 'Shaayii Ispeeshaala / ሻይ እስፔሻል', description: 'Special Tea', price: 70, imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 6 },
      { name: 'Shaayii Tosh / ሻይ ቶሽ', description: 'Toast Tea', price: 75, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 7 },
      { name: 'Ispriisaa / እስፕሪስ', description: 'Expresso Coffee', price: 45, imageUrl: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 8 },
      { name: 'Aannan Bulaa / ወተት ቡላ', description: 'Milk Bullet', price: 60, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 9 },
      { name: 'Aannan / ወተት', description: 'Milk', price: 55, imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 10 },
      { name: 'Maakiyyaatoo / ማኪያቶ', description: 'Macchiato', price: 60, imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 11 },
      { name: 'Bunaa / ቡና', description: 'Coffee', price: 35, imageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 12 },
      { name: 'Buna Jabanaa / የጀበና ቡና', description: 'Jebena Buna', price: 35, imageUrl: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 5, displayOrder: 13 },
    ];

    for (const item of hotDrinkItems) {
      const food = await FoodItem.create({
        categoryId: categories.hotDrinks._id,
        ...item,
        isAvailable: true,
        isActive: true,
      });
      foodItems.push(food);
    }

    // FOODS (4 items)
    const foodCategoryItems = [
      { name: 'Buna / ቡና', description: 'Coffee (Food)', price: 15, imageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 10, displayOrder: 1 },
      { name: 'Inqulaalaa / እንቁላል', description: 'Egg', price: 45, imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 10, displayOrder: 2 },
      { name: 'Inqulaalaa Firfir / እንቁላል ፍርፍር', description: 'Scrambled Egg', price: 80, imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 10, displayOrder: 3 },
      { name: 'Inqulaalaa Ispeeshaala / እንቁላል ስፔሻል', description: 'Special Egg', price: 120, imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 12, displayOrder: 4 },
    ];

    for (const item of foodCategoryItems) {
      const food = await FoodItem.create({
        categoryId: categories.foods._id,
        ...item,
        isAvailable: true,
        isActive: true,
      });
      foodItems.push(food);
    }

    // SOFT DRINKS & WATER (7 items)
    const softDrinkItems = [
      { name: 'Laslaasaa / ለስላሳ', description: 'Soft Drink', price: 50, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 2, displayOrder: 1 },
      { name: 'Koolaa / ኮካ', description: 'Cola', price: 50, imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 2, displayOrder: 2 },
      { name: 'Bishaan Liitira 2 / ውኃ 2 ሊትር', description: 'Water 2L', price: 80, imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 2, displayOrder: 3 },
      { name: 'Bishaan Liitira 1 / ውኃ 1 ሊትር', description: 'Water 1L', price: 55, imageUrl: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 2, displayOrder: 4 },
      { name: 'Bishaan Liitira 0.5 / ውኃ 0.5 ሊትር', description: 'Water 0.5L', price: 30, imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 2, displayOrder: 5 },
      { name: 'Amboo Meetraas / አምቦ ሜትራስ', description: 'Ambo Metress', price: 60, imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 2, displayOrder: 6 },
      { name: 'Novidaa / ኖቪዳ', description: 'Novida', price: 50, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 2, displayOrder: 7 },
    ];

    for (const item of softDrinkItems) {
      const food = await FoodItem.create({
        categoryId: categories.softDrinks._id,
        ...item,
        isAvailable: true,
        isActive: true,
      });
      foodItems.push(food);
    }

    // MEALS (7 items)
    const mealItems = [
      { name: 'Sup / ሱፕ', description: 'Soup', price: 150, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 15, displayOrder: 1 },
      { name: 'Ochooloonii / ኦቾሎኒ', description: 'Peanut Stew', price: 150, imageUrl: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 15, displayOrder: 2 },
      { name: 'Makaroonii / ማካሮኒ', description: 'Macaroni', price: 150, imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 15, displayOrder: 3 },
      { name: 'Paastaa / ፓስታ', description: 'Pasta', price: 150, imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 15, displayOrder: 4 },
      { name: 'Isupaageetii / ስፓጌቲ', description: 'Spaghetti', price: 150, imageUrl: 'https://images.unsplash.com/photo-1622973536968-3ead9e780960?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 15, displayOrder: 5 },
      { name: 'Paastaa Be Siga / ፓስታ በስጋ', description: 'Pasta with Meat', price: 150, imageUrl: 'https://images.unsplash.com/photo-1626844131082-256783844137?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 15, displayOrder: 6 },
      { name: 'Isupaageetii Be Siga / ስፓጌቲ በስጋ', description: 'Spaghetti with Meat', price: 150, imageUrl: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 15, displayOrder: 7 },
    ];

    for (const item of mealItems) {
      const food = await FoodItem.create({
        categoryId: categories.meals._id,
        ...item,
        isAvailable: true,
        isActive: true,
      });
      foodItems.push(food);
    }

    // SNACKS & FAST FOOD (15 items)
    const snackItems = [
      { name: 'Burger / በርገር', description: 'Burger', price: 350, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 20, displayOrder: 1 },
      { name: 'Special Burger / ስፔሻል በርገር', description: 'Special Burger', price: 450, imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 20, displayOrder: 2 },
      { name: 'Cheese Burger / ቺዝ በርገር', description: 'Cheese Burger', price: 400, imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 20, displayOrder: 3 },
      { name: 'Egg Burger / እግበርገር', description: 'Egg Burger', price: 450, imageUrl: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 20, displayOrder: 4 },
      { name: 'Double Burger / ድርብ በርገር', description: 'Double Burger', price: 550, imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 5 },
      { name: 'Burger with Cheese / በርገር በቺዝ', description: 'Burger with Cheese', price: 500, imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 20, displayOrder: 6 },
      { name: 'Pizza / ፒዛ', description: 'Pizza', price: 520, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 7 },
      { name: 'Special Pizza / ስፔሻል ፒዛ', description: 'Special Pizza', price: 570, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 8 },
      { name: 'Chicken Pizza / ቺክን ፒዛ', description: 'Chicken Pizza', price: 550, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 9 },
      { name: 'Tuna Pizza / ቱና ፒዛ', description: 'Tuna Pizza', price: 550, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 10 },
      { name: 'Beef Pizza / ቢፍ ፒዛ', description: 'Beef Pizza', price: 550, imageUrl: 'https://images.unsplash.com/photo-1548369937-47519962c11a?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 11 },
      { name: 'Vegetable Pizza / ቬጅተብል ፒዛ', description: 'Vegetable Pizza', price: 450, imageUrl: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 12 },
      { name: 'Pasta Pizza / ፓስታ ፒዛ', description: 'Pasta Pizza', price: 500, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 13 },
      { name: 'Farees Pizza / ፋሪስ ፒዛ', description: 'Farees Pizza', price: 600, imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 30, displayOrder: 14 },
      { name: 'Lasagna / ላዛኛ', description: 'Lasagna', price: 480, imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=900&h=700&fit=crop&q=85', preparationTimeMinutes: 25, displayOrder: 15 },
    ];

    for (const item of snackItems) {
      const food = await FoodItem.create({
        categoryId: categories.snacks._id,
        ...item,
        isAvailable: true,
        isActive: true,
      });
      foodItems.push(food);
    }

    // Summary
    logger.info('=======================================================');
    logger.info('SEEDING COMPLETED SUCCESSFULLY!');
    logger.info('=======================================================');
    logger.info(`Restaurant: ${RESTAURANT_NAME}`);
    logger.info(`Database: tasty_station_pos`);
    logger.info('=======================================================');
    logger.info('Staff Accounts (Password: Password123!)');
    logger.info(` - OWNER:    ${owner.email}`);
    logger.info(` - MANAGER:  ${manager.email}`);
    logger.info(` - CASHIER:  ${cashier.email}`);
    logger.info(` - KITCHEN:  ${kitchen.email}`);
    logger.info('=======================================================');
    logger.info('Categories Created: 5');
    logger.info(` - HOT DRINKS (${hotDrinkItems.length} items)`);
    logger.info(` - FOODS (${foodCategoryItems.length} items)`);
    logger.info(` - SOFT DRINKS & WATER (${softDrinkItems.length} items)`);
    logger.info(` - MEALS (${mealItems.length} items)`);
    logger.info(` - SNACKS & FAST FOOD (${snackItems.length} items)`);
    logger.info(`Total Food Items: ${foodItems.length}`);
    logger.info(`Tables Created: ${tables.length}`);
    logger.info('Meal Types Created: BREAKFAST (06:00-10:30), LUNCH (10:30-15:00), DINNER (15:00-22:00), ALL_DAY (00:00-23:59)');
    logger.info('All categories are available on every meal type; ALL_DAY is always active.');
    logger.info('=======================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error(`Database Seeding Failed: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
