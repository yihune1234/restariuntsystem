const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = require('./env');
const logger = require('./logger');
const Organization = require('../modules/organizations/organization.model');
const Branch = require('../modules/branches/branch.model');
const { User } = require('../modules/users/user.model');
const { Table } = require('../modules/tables/table.model');
const MealPeriod = require('../modules/menu/meal-period/meal-period.model');
const Category = require('../modules/menu/category/category.model');
const FoodItem = require('../modules/menu/food/food.model');
const DailyStock = require('../modules/inventory/daily-stock.model');
const { getTodayBusinessDate } = require('../utils/date');

const seedData = async () => {
  try {
    logger.info('Connecting to MongoDB for database seeding...');
    await mongoose.connect(config.mongo.uri);

    logger.info('Clearing existing demo data...');
    await Promise.all([
      Organization.deleteMany({}),
      Branch.deleteMany({}),
      User.deleteMany({}),
      Table.deleteMany({}),
      MealPeriod.deleteMany({}),
      Category.deleteMany({}),
      FoodItem.deleteMany({}),
      DailyStock.deleteMany({}),
    ]);

    // 0. Create a single Organization (Faarees Kaafee fi Restoorraantii).
    // Every entity (branch, users, tables, menu, stock, orders) references this.
    // Uses a FIXED _id so single-branch mode + the frontend's hardcoded default
    // IDs stay stable across re-seeds.
    logger.info('Creating Organization...');
    const org = await Organization.create({
      _id: new mongoose.Types.ObjectId('6a996ed977f5f01311afa271'),
      name: 'Faarees Kaafee fi Restoorraantii',
      ownerName: 'Abebe Bikila',
      ownerEmail: 'owner@habesha.com',
      ownerPhone: '+251911223344',
      settings: {
        currency: 'ETB',
        defaultTaxRate: 0.15,
        defaultServiceChargeRate: 0.05,
      },
      isActive: true,
    });

    // 1. Create Single Branch (Faarees Kaafee fi Restoorraantii)
    logger.info('Creating Branch...');
    const boleBranch = await Branch.create({
      _id: new mongoose.Types.ObjectId('6a996ed977f5f01311afa276'),
      organizationId: org._id,
      name: 'Bole Medhanialem Branch',
      code: 'BOLE-01',
      address: {
        city: 'Addis Ababa',
        subcity: 'Bole',
        street: 'Cameroon Street, Next to Edna Mall',
      },
      phone: '+251911112233',
      settings: {
        taxRate: 0.15,
        serviceChargeRate: 0.05,
        currency: 'ETB',
        openTime: '06:30',
        closeTime: '23:00',
        autoAcceptCashierOrders: true,
      },
      isActive: true,
    });

    // 2. Create Staff Users (all roles)
    logger.info('Creating Staff Users...');
    const defaultPassword = 'Password123!';

    await User.create({
      organizationId: org._id,
      name: 'Abebe Bikila (Owner)',
      email: 'owner@habesha.com',
      phone: '+251911223344',
      passwordHash: defaultPassword,
      role: 'OWNER',
      isActive: true,
    });

    await User.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      name: 'Sara Tadesse (Bole Manager)',
      email: 'manager.bole@habesha.com',
      phone: '+251911334455',
      passwordHash: defaultPassword,
      role: 'MANAGER',
      isActive: true,
    });

    await User.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      name: 'Dawit Kebede (Cashier)',
      email: 'cashier.bole@habesha.com',
      phone: '+251911445566',
      passwordHash: defaultPassword,
      role: 'CASHIER',
      isActive: true,
    });

    await User.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      name: 'Chef Solomon (Head Chef)',
      email: 'kitchen.bole@habesha.com',
      phone: '+251911556677',
      passwordHash: defaultPassword,
      role: 'KITCHEN',
      isActive: true,
    });

    await User.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      name: 'Hiwot Alemu (Lead Waiter)',
      email: 'waiter.bole@habesha.com',
      phone: '+251911667788',
      passwordHash: defaultPassword,
      role: 'WAITER',
      isActive: true,
    });

    // 3. Create Tables with QR tokens
    logger.info('Creating Tables with QR Tokens...');
    for (let i = 1; i <= 5; i++) {
      await Table.create({
        organizationId: org._id,
        branchId: boleBranch._id,
        tableNumber: `T-0${i}`,
        qrToken: `demo_qr_token_bole_table_0${i}`,
        capacity: i % 2 === 0 ? 4 : 2,
        status: 'AVAILABLE',
        isActive: true,
      });
    }

    // 4. Create Meal Periods
    logger.info('Creating Meal Periods...');
    const breakfast = await MealPeriod.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      name: 'BREAKFAST',
      startTime: '06:30',
      endTime: '11:30',
      displayOrder: 1,
      isActive: true,
    });

    const lunch = await MealPeriod.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      name: 'LUNCH',
      startTime: '11:30',
      endTime: '16:00',
      displayOrder: 2,
      isActive: true,
    });

    const allDay = await MealPeriod.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      name: 'ALL_DAY',
      startTime: '06:30',
      endTime: '23:00',
      displayOrder: 3,
      isActive: true,
    });

    // 5. Create Categories
    logger.info('Creating Categories...');
    const hotBeverages = await Category.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      mealPeriodId: allDay._id,
      name: 'HOT BEVERAGES',
      displayOrder: 1,
      isActive: true,
    });

    const tradBreakfast = await Category.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      mealPeriodId: breakfast._id,
      name: 'TRADITIONAL BREAKFAST',
      displayOrder: 1,
      isActive: true,
    });

    const mainsCategory = await Category.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      mealPeriodId: lunch._id,
      name: 'MAINS & SPECIALTIES',
      displayOrder: 1,
      isActive: true,
    });

    const faareesHotDrinks = await Category.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      mealPeriodId: allDay._id,
      name: 'HOT DRINKS',
      displayOrder: 10,
      isActive: true,
    });

    const faareesFoods = await Category.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      mealPeriodId: allDay._id,
      name: 'FOODS',
      displayOrder: 20,
      isActive: true,
    });

    const faareesSoftDrinks = await Category.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      mealPeriodId: allDay._id,
      name: 'SOFT DRINKS & WATER',
      displayOrder: 30,
      isActive: true,
    });

    const faareesMeals = await Category.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      mealPeriodId: allDay._id,
      name: 'MEALS',
      displayOrder: 40,
      isActive: true,
    });

    const faareesSnacks = await Category.create({
      organizationId: org._id,
      branchId: boleBranch._id,
      mealPeriodId: allDay._id,
      name: 'SNACKS & FAST FOOD',
      displayOrder: 50,
      isActive: true,
    });

    // 6. Create Food Items
    logger.info('Creating Food Items...');
    const foods = [
      {
        categoryId: hotBeverages._id,
        name: 'Addis Special Macchiato',
        description: 'Authentic Ethiopian dark roast coffee with velvety steamed milk foam',
        price: 75.0,
        imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop',
        preparationTimeMinutes: 5,
        displayOrder: 1,
      },
      {
        categoryId: hotBeverages._id,
        name: 'Spiced Herbal Tea (Korerima & Cinnamon)',
        description: 'Traditional aromatic spiced tea blend',
        price: 45.0,
        imageUrl: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&h=300&fit=crop',
        preparationTimeMinutes: 5,
        displayOrder: 2,
      },
      {
        categoryId: tradBreakfast._id,
        name: 'Special Chechebsa with Pure Honey & Butter',
        description: 'Pan-fried shredded flatbread tossed in spiced clarified butter (kibe) and pure honey',
        price: 260.0,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop',
        preparationTimeMinutes: 12,
        displayOrder: 1,
      },
      {
        categoryId: tradBreakfast._id,
        name: 'Scrambled Eggs with Tomato & Chili (Inkulal Firfir)',
        description: 'Farm fresh eggs scrambled with diced onions, tomatoes, and green peppers served with warm bread',
        price: 190.0,
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
        preparationTimeMinutes: 10,
        displayOrder: 2,
      },
      {
        categoryId: mainsCategory._id,
        name: 'Habesha Special Beef Burger with Fries',
        description: '200g prime beef patty, caramelized onions, melted gouda, house sauce, and seasoned potato wedges',
        price: 420.0,
        imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
        preparationTimeMinutes: 20,
        displayOrder: 1,
      },
      {
        categoryId: mainsCategory._id,
        name: 'Special Doro Wat (Traditional Chicken Stew)',
        description: 'Slow-cooked organic chicken in rich berbere sauce served with boiled egg and fresh injera',
        price: 550.0,
        imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop',
        preparationTimeMinutes: 15,
        displayOrder: 2,
      },
      {
        categoryId: mainsCategory._id,
        name: 'Shiro Tegabino with Kibe',
        description: 'Sizzling clay pot ground chickpea stew cooked with clarified herbal butter and served with injera',
        price: 240.0,
        imageUrl: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400&h=300&fit=crop',
        preparationTimeMinutes: 12,
        displayOrder: 3,
      },

      // ===== Faarees Kaafee fi Restoorraantii real menu (ALL_DAY) =====
      // HOT DRINKS
      { categoryId: faareesHotDrinks._id, name: 'Shaayi Loomii / ሻይ ሎሚ', description: 'Lemon Tea', price: 45.0, imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 1 },
      { categoryId: faareesHotDrinks._id, name: 'Shaayii Burtukaana / ሻይ ብርቱካን', description: 'Orange Tea', price: 45.0, imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 2 },
      { categoryId: faareesHotDrinks._id, name: 'Shaayii Anaanasa / ሻይ አናናስ', description: 'Pineapple Tea', price: 45.0, imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 3 },
      { categoryId: faareesHotDrinks._id, name: 'Shaayii Maangoo / ሻይ ማንጎ', description: 'Mango Tea', price: 45.0, imageUrl: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 4 },
      { categoryId: faareesHotDrinks._id, name: 'Qashar / ቐሸር', description: 'Qashar', price: 45.0, imageUrl: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 5 },
      { categoryId: faareesHotDrinks._id, name: 'Shaayii Ispeeshaala / ሻይ እስፔሻል', description: 'Special Tea', price: 70.0, imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 6 },
      { categoryId: faareesHotDrinks._id, name: 'Shaayii Tosh / ሻይ ቶሽ', description: 'Toast Tea', price: 75.0, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 7 },
      { categoryId: faareesHotDrinks._id, name: 'Ispriisaa / እስፕሪስ', description: 'Expresso Coffee', price: 45.0, imageUrl: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 8 },
      { categoryId: faareesHotDrinks._id, name: 'Aannan Bulaa / ወተት ቡላ', description: 'Milk Bullet', price: 60.0, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 9 },
      { categoryId: faareesHotDrinks._id, name: 'Aannan / ወተት', description: 'Milk', price: 55.0, imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 10 },
      { categoryId: faareesHotDrinks._id, name: 'Maakiyyaatoo / ማኪያቶ', description: 'Macchiato', price: 60.0, imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 11 },
      { categoryId: faareesHotDrinks._id, name: 'Bunaa / ቡና', description: 'Coffee', price: 35.0, imageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 12 },
      { categoryId: faareesHotDrinks._id, name: 'Buna Jabanaa / የጀበና ቡና', description: 'Jebena Buna', price: 35.0, imageUrl: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=400&h=300&fit=crop', preparationTimeMinutes: 5, displayOrder: 13 },

      // FOODS
      { categoryId: faareesFoods._id, name: 'Buna / ቡና', description: 'Coffee (Food)', price: 15.0, imageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&h=300&fit=crop', preparationTimeMinutes: 10, displayOrder: 1 },
      { categoryId: faareesFoods._id, name: 'Inqulaalaa / እንቁላል', description: 'Egg', price: 45.0, imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=300&fit=crop', preparationTimeMinutes: 10, displayOrder: 2 },
      { categoryId: faareesFoods._id, name: 'Inqulaalaa Firfir / እንቁላል ፍርፍር', description: 'Scrambled Egg', price: 80.0, imageUrl: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop', preparationTimeMinutes: 10, displayOrder: 3 },
      { categoryId: faareesFoods._id, name: 'Inqulaalaa Ispeeshaala / እንቁላል ስፔሻል', description: 'Special Egg', price: 120.0, imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop', preparationTimeMinutes: 12, displayOrder: 4 },

      // SOFT DRINKS & WATER
      { categoryId: faareesSoftDrinks._id, name: 'Laslaasaa / ለስላሳ', description: 'Soft Drink', price: 50.0, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop', preparationTimeMinutes: 2, displayOrder: 1 },
      { categoryId: faareesSoftDrinks._id, name: 'Koolaa / ኮካ', description: 'Cola', price: 50.0, imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop', preparationTimeMinutes: 2, displayOrder: 2 },
      { categoryId: faareesSoftDrinks._id, name: 'Bishaan Liitira 2 / ውኃ 2 ሊትር', description: 'Water 2L', price: 80.0, imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop', preparationTimeMinutes: 2, displayOrder: 3 },
      { categoryId: faareesSoftDrinks._id, name: 'Bishaan Liitira 1 / ውኃ 1 ሊትር', description: 'Water 1L', price: 55.0, imageUrl: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&h=300&fit=crop', preparationTimeMinutes: 2, displayOrder: 4 },
      { categoryId: faareesSoftDrinks._id, name: 'Bishaan Liitira 0.5 / ውኃ 0.5 ሊትር', description: 'Water 0.5L', price: 30.0, imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop', preparationTimeMinutes: 2, displayOrder: 5 },
      { categoryId: faareesSoftDrinks._id, name: 'Amboo Meetraas / አምቦ ሜትራስ', description: 'Ambo Metress', price: 60.0, imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=400&h=300&fit=crop', preparationTimeMinutes: 2, displayOrder: 6 },
      { categoryId: faareesSoftDrinks._id, name: 'Novidaa / ኖቪዳ', description: 'Novida', price: 50.0, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop', preparationTimeMinutes: 2, displayOrder: 7 },

      // MEALS
      { categoryId: faareesMeals._id, name: 'Sup / ሱፕ', description: 'Soup', price: 150.0, imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop', preparationTimeMinutes: 15, displayOrder: 1 },
      { categoryId: faareesMeals._id, name: 'Ochooloonii / ኦቾሎኒ', description: 'Peanut Stew', price: 150.0, imageUrl: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400&h=300&fit=crop', preparationTimeMinutes: 15, displayOrder: 2 },
      { categoryId: faareesMeals._id, name: 'Makaroonii / ማካሮኒ', description: 'Macaroni', price: 150.0, imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop', preparationTimeMinutes: 15, displayOrder: 3 },
      { categoryId: faareesMeals._id, name: 'Paastaa / ፓስታ', description: 'Pasta', price: 150.0, imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop', preparationTimeMinutes: 15, displayOrder: 4 },
      { categoryId: faareesMeals._id, name: 'Isupaageetii / ስፓጌቲ', description: 'Spaghetti', price: 150.0, imageUrl: 'https://images.unsplash.com/photo-1622973536968-3ead9e780960?w=400&h=300&fit=crop', preparationTimeMinutes: 15, displayOrder: 5 },
      { categoryId: faareesMeals._id, name: 'Paastaa Be Siga / ፓስታ በስጋ', description: 'Pasta with Meat', price: 150.0, imageUrl: 'https://images.unsplash.com/photo-1626844131082-256783844137?w=400&h=300&fit=crop', preparationTimeMinutes: 15, displayOrder: 6 },
      { categoryId: faareesMeals._id, name: 'Isupaageetii Be Siga / ስፓጌቲ በስጋ', description: 'Spaghetti with Meat', price: 150.0, imageUrl: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=400&h=300&fit=crop', preparationTimeMinutes: 15, displayOrder: 7 },

      // SNACKS & FAST FOOD
      { categoryId: faareesSnacks._id, name: 'Burger / በርገር', description: 'Burger', price: 350.0, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', preparationTimeMinutes: 20, displayOrder: 1 },
      { categoryId: faareesSnacks._id, name: 'Special Burger / ስፔሻል በርገር', description: 'Special Burger', price: 450.0, imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop', preparationTimeMinutes: 20, displayOrder: 2 },
      { categoryId: faareesSnacks._id, name: 'Cheese Burger / ቺዝ በርገር', description: 'Cheese Burger', price: 400.0, imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop', preparationTimeMinutes: 20, displayOrder: 3 },
      { categoryId: faareesSnacks._id, name: 'Egg Burger / እግበርገር', description: 'Egg Burger', price: 450.0, imageUrl: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=400&h=300&fit=crop', preparationTimeMinutes: 20, displayOrder: 4 },
      { categoryId: faareesSnacks._id, name: 'Double Burger / ድርብ በርገር', description: 'Double Burger', price: 550.0, imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 5 },
      { categoryId: faareesSnacks._id, name: 'Burger with Cheese / በርገር በቺዝ', description: 'Burger with Cheese', price: 500.0, imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop', preparationTimeMinutes: 20, displayOrder: 6 },
      { categoryId: faareesSnacks._id, name: 'Pizza / ፒዛ', description: 'Pizza', price: 520.0, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 7 },
      { categoryId: faareesSnacks._id, name: 'Special Pizza / ስፔሻል ፒዛ', description: 'Special Pizza', price: 570.0, imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 8 },
      { categoryId: faareesSnacks._id, name: 'Chicken Pizza / ቺክን ፒዛ', description: 'Chicken Pizza', price: 550.0, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 9 },
      { categoryId: faareesSnacks._id, name: 'Tuna Pizza / ቱና ፒዛ', description: 'Tuna Pizza', price: 550.0, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 10 },
      { categoryId: faareesSnacks._id, name: 'Beef Pizza / ቢፍ ፒዛ', description: 'Beef Pizza', price: 550.0, imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 11 },
      { categoryId: faareesSnacks._id, name: 'Vegetable Pizza / ቬጅተብል ፒዛ', description: 'Vegetable Pizza', price: 450.0, imageUrl: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 12 },
      { categoryId: faareesSnacks._id, name: 'Pasta Pizza / ፓስታ ፒዛ', description: 'Pasta Pizza', price: 500.0, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 13 },
      { categoryId: faareesSnacks._id, name: 'Farees Pizza / ፋሪስ ፒዛ', description: 'Farees Pizza', price: 600.0, imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=400&h=300&fit=crop', preparationTimeMinutes: 30, displayOrder: 14 },
      { categoryId: faareesSnacks._id, name: 'Lasagna / ላዛኛ', description: 'Lasagna', price: 480.0, imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop', preparationTimeMinutes: 25, displayOrder: 15 },
    ];

    const todayDate = getTodayBusinessDate();

    for (const foodData of foods) {
      const food = await FoodItem.create({
        organizationId: org._id,
        branchId: boleBranch._id,
        ...foodData,
        isAvailable: true,
        isActive: true,
      });

      await DailyStock.create({
        organizationId: org._id,
        branchId: boleBranch._id,
        foodItemId: food._id,
        businessDate: todayDate,
        preparedQuantity: 50,
        soldQuantity: 0,
        remainingQuantity: 50,
        lowStockThreshold: 5,
        status: 'AVAILABLE',
      });
    }

    logger.info('=======================================================');
    logger.info('SEEDING COMPLETED SUCCESSFULLY!');
    logger.info('=======================================================');
    logger.info('Branch ID: ' + boleBranch._id);
    logger.info('Demo Staff Accounts (Password: Password123!)');
    logger.info(' - OWNER:    owner@habesha.com');
    logger.info(' - MANAGER:  manager.bole@habesha.com');
    logger.info(' - CASHIER:  cashier.bole@habesha.com');
    logger.info(' - KITCHEN:  kitchen.bole@habesha.com');
    logger.info(' - WAITER:   waiter.bole@habesha.com');
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
