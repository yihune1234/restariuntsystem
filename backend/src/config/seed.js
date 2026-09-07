const mongoose = require('mongoose');
const Category = require('../modules/menu/category/category.model');
const FoodItem = require('../modules/menu/food/food.model');
const MealPeriod = require('../modules/menu/meal-period/meal-period.model');
const { User } = require('../modules/users/user.model');

const MONGODB_URI = 'mongodb+srv://yihune908_db_user:Jy21YOv2mReY7fQK@cluster0.p78x026.mongodb.net/faarees_menu_db?appName=Cluster0';

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // ──────────────────────────────────────────────
    // STEP 1: WIPE ALL EXISTING MENU DATA
    // ──────────────────────────────────────────────
    console.log('Wiping existing menu data...');
    await Category.deleteMany({});
    await FoodItem.deleteMany({});
    await MealPeriod.deleteMany({});
    await User.deleteMany({});
    console.log('All existing data cleared.');

    // ──────────────────────────────────────────────
    // STEP 2: CREATE ADMIN USER
    // ──────────────────────────────────────────────
    console.log('Creating admin user...');
    await User.create({
      name: 'Admin',
      email: 'admin@faarees.com',
      passwordHash: 'admin123',
      role: 'OWNER',
      isActive: true,
    });
    console.log('Admin user created: admin@faarees.com');

    // ──────────────────────────────────────────────
    // STEP 3: CREATE MEAL SCHEDULES / TIME WINDOWS
    // ──────────────────────────────────────────────
    console.log('Creating meal schedules...');
    const mealPeriods = await MealPeriod.insertMany([
      {
        name: 'BREAKFAST',
        nameEn: 'Breakfast',
        nameOm: 'Ciree',
        nameAm: 'ቁርስ',
        startTime: '06:00',
        endTime: '11:30',
        displayOrder: 1,
        isActive: true,
      },
      {
        name: 'LUNCH_DINNER',
        nameEn: 'Lunch & Dinner',
        nameOm: 'Haŋaa fi Fajjii',
        nameAm: 'ከፋየ እና ማታ ምግብ',
        startTime: '11:30',
        endTime: '22:30',
        displayOrder: 2,
        isActive: true,
      },
    ]);

    const breakfastSchedule = mealPeriods[0]._id;
    const lunchDinnerSchedule = mealPeriods[1]._id;

    console.log(`Created ${mealPeriods.length} meal schedules`);

    // ──────────────────────────────────────────────
    // STEP 4: CREATE CATEGORIES & SUBCATEGORIES
    // (category <-> meal schedule = many-to-many)
    // ──────────────────────────────────────────────
    console.log('Creating categories...');

    const rootCategories = await Category.insertMany([
      {
        name: 'HOT DRINKS',
        nameEn: 'Hot Drinks',
        nameOm: 'Shaayii fi Buna',
        nameAm: 'ትኩስ ነገር',
        mealScheduleIds: [], // always available via item-level isAlwaysAvailable
        displayOrder: 1,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'COLD DRINKS & JUICES',
        nameEn: 'Cold Drinks & Juices',
        nameOm: 'Dhugaatii Qabbanaawaa',
        nameAm: 'ቀዝቃዛ ነገር',
        mealScheduleIds: [],
        displayOrder: 2,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'SNACKS & FAST FOOD',
        nameEn: 'Snacks & Fast Food',
        nameOm: 'Makkasaa / Fast Food',
        nameAm: 'መክሰስ',
        mealScheduleIds: [],
        displayOrder: 3,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'BREAKFAST',
        nameEn: 'Breakfast',
        nameOm: 'Ciree',
        nameAm: 'ቁርስ',
        mealScheduleIds: [breakfastSchedule],
        displayOrder: 4,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'MAIN DISHES',
        nameEn: 'Main Dishes',
        nameOm: 'Laaqana fi Irbaata',
        nameAm: 'ምሳ እና እራት',
        mealScheduleIds: [lunchDinnerSchedule],
        displayOrder: 5,
        isActive: true,
        isHidden: false,
      },
    ]);

    const [
      hotDrinksCat,
      coldDrinksCat,
      snacksCat,
      breakfastCat,
      mainDishesCat,
    ] = rootCategories;

    const breakfastSubcategories = await Category.insertMany([
      {
        name: 'TRADITIONAL BREAKFAST',
        nameEn: 'Traditional Breakfast',
        nameOm: 'Ciree Aadaa',
        nameAm: 'የሀበሻ ቁርስ',
        parentId: breakfastCat._id,
        mealScheduleIds: [breakfastSchedule],
        displayOrder: 1,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'EGGS & SANDWICHES',
        nameEn: 'Eggs & Sandwiches',
        nameOm: 'Killee fi Sanduuchi',
        nameAm: 'እንቁላል እና ሳንድዊች',
        parentId: breakfastCat._id,
        mealScheduleIds: [breakfastSchedule],
        displayOrder: 2,
        isActive: true,
        isHidden: false,
      },
    ]);

    const [
      bfastTraditionalCat,
      bfastEggCat,
    ] = breakfastSubcategories;

    console.log(`Created ${rootCategories.length + breakfastSubcategories.length} categories`);

    // ──────────────────────────────────────────────
    // STEP 5: CREATE ALL MENU ITEMS
    // (item <-> category = many-to-many via categoryIds)
    // (item <-> meal schedule = many-to-many via mealScheduleIds)
    // ──────────────────────────────────────────────
    console.log('Creating menu items...');

    const allFoodItems = [
      // ============================================================
      // HOT DRINKS / SHAAYII FI BUNA / ትኩስ ነገር (Always Available)
      // is_always_available = TRUE -> visible 24/7
      // ============================================================
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Lemon Tea',
        nameEn: 'Lemon Tea',
        nameOm: 'Shaayi Loomii',
        nameAm: 'ሻይ በሎሚ',
        description: 'Fresh lemon tea',
        descriptionEn: 'Fresh lemon tea',
        descriptionOm: 'Shaayii loomii haaraa',
        descriptionAm: 'አዲስ ሻይ በሎሚ',
        price: 25,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 1,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Orange Tea',
        nameEn: 'Orange Tea',
        nameOm: 'Shaayi Burtukaana',
        nameAm: 'ሻይ በብርቱካን',
        description: 'Fresh orange tea',
        descriptionEn: 'Fresh orange tea',
        descriptionOm: 'Shaayii burtukaana haaraa',
        descriptionAm: 'አዲስ ሻይ በብርቱካን',
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 2,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Pineapple Tea',
        nameEn: 'Pineapple Tea',
        nameOm: 'Shaayi Ananaas',
        nameAm: 'ሻይ በአናናስ',
        description: 'Fresh pineapple tea',
        descriptionEn: 'Fresh pineapple tea',
        descriptionOm: 'Shaayii ananaas haaraa',
        descriptionAm: 'አዲስ ሻይ በአናናስ',
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 3,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Mango Tea',
        nameEn: 'Mango Tea',
        nameOm: 'Shaayi Maangoo',
        nameAm: 'ሻይ በሜንጎ',
        description: 'Fresh mango tea',
        descriptionEn: 'Fresh mango tea',
        descriptionOm: 'Shaayii maangoo haaraa',
        descriptionAm: 'አዲስ ሻይ በሜንጎ',
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 4,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Ginger Tea (Qashar)',
        nameEn: 'Ginger Tea (Qashar)',
        nameOm: 'Qashar / Shaayi Zinjibila',
        nameAm: 'ቀሸር / የዝንጅብል ሻይ',
        description: 'Traditional ginger tea',
        descriptionEn: 'Traditional ginger tea',
        descriptionOm: 'Qashar / Shaayii zinjibila aadaa',
        descriptionAm: 'ባሕርያዊ የዝንጅብል ሻይ',
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 5,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Special Tea',
        nameEn: 'Special Tea',
        nameOm: 'Shaayi Ispeeshaal',
        nameAm: 'ስፔሻል ሻይ',
        description: 'Special blend tea',
        descriptionEn: 'Special blend tea',
        descriptionOm: 'Shaayii ispeeshaal',
        descriptionAm: 'ስፔሻል ሻይ',
        price: 70,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 6,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Cinnamon Tea (Ispriisa)',
        nameEn: 'Cinnamon Tea (Ispriisa)',
        nameOm: 'Shaayi Ispriisa',
        nameAm: 'ስፕሪስ ሻይ',
        description: 'Cinnamon flavored tea',
        descriptionEn: 'Cinnamon flavored tea',
        descriptionOm: 'Shaayii ispriisa',
        descriptionAm: 'ስፕሪስ ሻይ',
        price: 75,
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 7,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Milk',
        nameEn: 'Milk',
        nameOm: 'Aannan',
        nameAm: 'ወተት',
        description: 'Fresh warm milk',
        descriptionEn: 'Fresh warm milk',
        descriptionOm: 'Aannan haaraa',
        descriptionAm: 'አዲስ ሞቅ ወተት',
        price: 45,
        imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 8,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Macchiato',
        nameEn: 'Macchiato',
        nameOm: 'Maakiyatoo',
        nameAm: 'ማኪያቶ',
        description: 'Espresso with milk foam',
        descriptionEn: 'Espresso with milk foam',
        descriptionOm: 'Ispresoootii aannan',
        descriptionAm: 'ኢስፕሬሶ ከወተት ፎም',
        price: 50,
        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 9,
      },
      {
        categoryIds: [hotDrinksCat._id],
        name: 'Traditional Coffee (Buna Jabanaa)',
        nameEn: 'Traditional Coffee (Buna Jabanaa)',
        nameOm: 'Buna Jabanaa',
        nameAm: 'የጀበና ቡና',
        description: 'Traditional Ethiopian coffee ceremony',
        descriptionEn: 'Traditional Ethiopian coffee ceremony',
        descriptionOm: 'Buna jabanaa Itoophiyaa aadaa',
        descriptionAm: 'ባሕርያዊ የኢትዮጵያ ቡና ሥነ ሥርዓት',
        price: 35,
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 10,
      },

      // ============================================================
      // COLD DRINKS & JUICES / DHUGAATII QABBANAAWAA / ቀዝቃዛ ነገር
      // ============================================================
      {
        categoryIds: [coldDrinksCat._id],
        name: 'Soft Drinks (Coca / Fanta / Sprite)',
        nameEn: 'Soft Drinks (Coca / Fanta / Sprite)',
        nameOm: 'Dhugaatii Qabbanaawaa',
        nameAm: 'ለስላሳ',
        description: 'Assorted soft drinks',
        descriptionEn: 'Assorted soft drinks',
        descriptionOm: 'Dhugaatii qabbanaawaa',
        descriptionAm: 'ለስላሳ መጠጦች',
        price: 50,
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 1,
      },
      {
        categoryIds: [coldDrinksCat._id],
        name: 'Mineral Water 2L',
        nameEn: 'Mineral Water 2L',
        nameOm: 'Bishaan Litira 2',
        nameAm: '2 ሊትር ውሃ',
        description: 'Pure mineral water 2 liters',
        descriptionEn: 'Pure mineral water 2 liters',
        descriptionOm: 'Bishaan filebaraa litira 2',
        descriptionAm: '2 ሊትር ንጹህ ውሃ',
        price: 80,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Glass_of_cold_mineral_water.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 2,
      },
      {
        categoryIds: [coldDrinksCat._id],
        name: 'Mineral Water 1L',
        nameEn: 'Mineral Water 1L',
        nameOm: 'Bishaan Litira 1',
        nameAm: '1 ሊትር ውሃ',
        description: 'Pure mineral water 1 liter',
        descriptionEn: 'Pure mineral water 1 liter',
        descriptionOm: 'Bishaan filebaraa litira 1',
        descriptionAm: '1 ሊትር ንጹህ ውሃ',
        price: 50,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Glass_of_cold_mineral_water.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 3,
      },
      {
        categoryIds: [coldDrinksCat._id],
        name: 'Mineral Water 0.5L',
        nameEn: 'Mineral Water 0.5L',
        nameOm: 'Bishaan Litira 0.5',
        nameAm: '0.5 ሊትር ውሃ',
        description: 'Pure mineral water half liter',
        descriptionEn: 'Pure mineral water half liter',
        descriptionOm: 'Bishaan filebaraa litira 0.5',
        descriptionAm: '0.5 ሊትር ንጹህ ውሃ',
        price: 30,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Glass_of_cold_mineral_water.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 4,
      },
      {
        categoryIds: [coldDrinksCat._id],
        name: 'Ambo Mineral Water',
        nameEn: 'Ambo Mineral Water',
        nameOm: 'Amboo Filebaraa',
        nameAm: 'አምቦ ውሃ',
        description: 'Ambo natural mineral water',
        descriptionEn: 'Ambo natural mineral water',
        descriptionOm: 'Amboo filebaraa',
        descriptionAm: 'አምቦ ተፈጥሮ ውሃ',
        price: 45,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Glass_of_cold_mineral_water.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 5,
      },
      {
        categoryIds: [coldDrinksCat._id],
        name: 'Novida',
        nameEn: 'Novida',
        nameOm: 'Noviidaa',
        nameAm: 'ኖቪዳ',
        description: 'Refreshing fruit flavored drink',
        descriptionEn: 'Refreshing fruit flavored drink',
        descriptionOm: 'Dhugaatii qabbanaawaa',
        descriptionAm: 'ለሚያርፍ ፍራፍሬ መጠን',
        price: 50,
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 6,
      },

      // ============================================================
      // SNACKS & FAST FOOD / MAKKASAA / መክሰስ (Always Available)
      // ============================================================
      {
        categoryIds: [snacksCat._id],
        name: 'Special Burger',
        nameEn: 'Special Burger',
        nameOm: 'Buurgeerii Ispeeshaal',
        nameAm: 'ስፔሻል በርገር',
        description: 'Premium beef burger with cheese and veggies',
        descriptionEn: 'Premium beef burger with cheese and veggies',
        descriptionOm: 'Buurgeerii sagaa ispeeshaal qubsumtiin',
        descriptionAm: 'ፕሪሚየም በርገር ከስጋ ቺዝ እና አትክልት',
        price: 350,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 1,
      },
      {
        categoryIds: [snacksCat._id],
        name: 'Club Sandwich',
        nameEn: 'Club Sandwich',
        nameOm: 'Saamwiii',
        nameAm: 'ክለብ ሳንድዊች',
        description: 'Triple-layer club sandwich with chicken, egg and veggies',
        descriptionEn: 'Triple-layer club sandwich with chicken, egg and veggies',
        descriptionOm: 'Saamwii sadarkaa lukkuu, buqqoo fi aankilootiin',
        descriptionAm: 'ደረጃ ሶስት ክለብ ሳንድዊች ከዶሮ እንቁላል እና አትክልት',
        price: 280,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Club-sandwich.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 2,
      },
      {
        categoryIds: [snacksCat._id],
        name: 'Pizza (Margherita)',
        nameEn: 'Pizza (Margherita)',
        nameOm: 'Pizzaa Maarggiiritaa',
        nameAm: 'ፒዛ (ማርጋሪታ)',
        description: 'Classic margherita pizza with tomato and mozzarella',
        descriptionEn: 'Classic margherita pizza with tomato and mozzarella',
        descriptionOm: 'Pizzaa keessoo, tomatoo fi mocarellaan',
        descriptionAm: 'ክላሲክ ማርጋሪታ ፒዛ ከቲማቲም እና ሞዛሬላ',
        price: 420,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pizza-napoletana.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: true,
        mealScheduleIds: [],
        isActive: true,
        displayOrder: 3,
      },

      // ============================================================
      // BREAKFAST - TRADITIONAL / CIREE AADAA / የሀበሻ ቁርስ
      // (item <-> meal schedule: Breakfast)
      // ============================================================
      {
        categoryIds: [bfastTraditionalCat._id],
        name: 'Special Foul',
        nameEn: 'Special Foul',
        nameOm: 'Fuulli Ispeeshaal',
        nameAm: 'ፉል ስፔሻል',
        description: 'Full traditional breakfast special',
        descriptionEn: 'Full traditional breakfast special',
        descriptionOm: 'Fuulli ciree ispeeshaal',
        descriptionAm: 'ፉል ባሕርያዊ ቁርስ ስፔሻል',
        price: 190,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ful_Medames.JPG?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule],
        isActive: true,
        displayOrder: 1,
      },
      {
        categoryIds: [bfastTraditionalCat._id],
        name: 'Foul',
        nameEn: 'Foul',
        nameOm: 'Fuula',
        nameAm: 'ፉል',
        description: 'Normal traditional breakfast',
        descriptionEn: 'Normal traditional breakfast',
        descriptionOm: 'Fuulli ciree normal',
        descriptionAm: 'መደበኛ ባሕርያዊ ቁርስ',
        price: 140,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ful_medames_%28arabic_meal%29.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule],
        isActive: true,
        displayOrder: 2,
      },
      {
        categoryIds: [bfastTraditionalCat._id],
        name: 'Chechebsa with Butter',
        nameEn: 'Chechebsa with Butter',
        nameOm: 'Cacabsaa Dhadhaan',
        nameAm: 'ጨጨብሳ በቅቤ',
        description: 'Chechebsa served with spiced butter',
        descriptionEn: 'Chechebsa served with spiced butter',
        descriptionOm: 'Cacabsaa dhadhaanitin',
        descriptionAm: 'ጨጨብሳ በቅቤ የተዘጋጀ',
        price: 190,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kita_herb_bread.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule],
        isActive: true,
        displayOrder: 3,
      },
      {
        categoryIds: [bfastTraditionalCat._id],
        name: 'Chechebsa with Honey & Butter',
        nameEn: 'Chechebsa with Honey & Butter',
        nameOm: 'Cacabsaa Dammaa fi Dhadhaan',
        nameAm: 'ጨጨብሳ በቅቤ እና ማር',
        description: 'Chechebsa with honey and butter',
        descriptionEn: 'Chechebsa with honey and butter',
        descriptionOm: 'Cacabsaa dammaa fi dhadhaanitin',
        descriptionAm: 'ጨጨብሳ በቅቤ እና ማር የተዘጋጀ',
        price: 250,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kita_herb_bread.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule],
        isActive: true,
        displayOrder: 4,
      },
      {
        categoryIds: [bfastTraditionalCat._id],
        name: 'Dry Beef Firfir',
        nameEn: 'Dry Beef Firfir',
        nameOm: 'Qaanqaa Firfir',
        nameAm: 'ቋንጣ ፍርፍር',
        description: 'Dry beef firfir with injera',
        descriptionEn: 'Dry beef firfir with injera',
        descriptionOm: 'Qaanqaa firfir irreechaan',
        descriptionAm: 'ቋንጣ ፍርፍር ከእርጋ',
        price: 320,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kitcha_fit_fit.png?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule],
        isActive: true,
        displayOrder: 5,
      },
      {
        categoryIds: [bfastTraditionalCat._id],
        name: 'Meat Firfir',
        nameEn: 'Meat Firfir',
        nameOm: 'Foon Firfir',
        nameAm: 'የስጋ ፍርፍር',
        description: 'Meat firfir with injera',
        descriptionEn: 'Meat firfir with injera',
        descriptionOm: 'Foon firfir irreechaan',
        descriptionAm: 'የስጋ ፍርፍር ከእርጋ',
        price: 300,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Firfir.JPG?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule],
        isActive: true,
        displayOrder: 6,
      },

      // ============================================================
      // BREAKFAST - EGGS & SANDWICHES / KILLEE FI SANDUUCHI / እንቁላል እና ሳንድዊች
      // ============================================================
      {
        categoryIds: [bfastEggCat._id, snacksCat._id],
        name: 'Special Omelette',
        nameEn: 'Special Omelette',
        nameOm: 'Inqulaala Ispeeshaal',
        nameAm: 'ስፔሻል እንቁላል',
        description: 'Special omelette with vegetables',
        descriptionEn: 'Special omelette with vegetables',
        descriptionOm: 'Inqulaala ispeeshaal kuduraa',
        descriptionAm: 'ስፔሻል እንቁላል ከአትክልት',
        price: 160,
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule, lunchDinnerSchedule],
        isActive: true,
        displayOrder: 1,
      },
      {
        categoryIds: [bfastEggCat._id],
        name: 'Scrambled Eggs with Bread',
        nameEn: 'Scrambled Eggs with Bread',
        nameOm: 'Inqulaala Dhaabbataa',
        nameAm: 'እንቁላል በዳቦ',
        description: 'Scrambled eggs with fresh bread',
        descriptionEn: 'Scrambled eggs with fresh bread',
        descriptionOm: 'Inqulaala dhaabbataa haaraa',
        descriptionAm: 'እንቁላል በአዲስ ዳቦ',
        price: 140,
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule],
        isActive: true,
        displayOrder: 2,
      },
      {
        categoryIds: [bfastEggCat._id],
        name: 'Tuna Sandwich',
        nameEn: 'Tuna Sandwich',
        nameOm: 'Sanduuchi Tunaa',
        nameAm: 'ቱና ሳንድዊች',
        description: 'Fresh tuna sandwich',
        descriptionEn: 'Fresh tuna sandwich',
        descriptionOm: 'Sanduuchi tunaa haaraa',
        descriptionAm: 'አዲስ ቱና ሳንድዊች',
        price: 270,
        imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule, lunchDinnerSchedule],
        isActive: true,
        displayOrder: 3,
      },
      {
        categoryIds: [bfastEggCat._id],
        name: 'Veggie Sandwich',
        nameEn: 'Veggie Sandwich',
        nameOm: 'Sanduuchi Kuduraa',
        nameAm: 'የትክልት ሳንድዊች',
        description: 'Fresh vegetable sandwich',
        descriptionEn: 'Fresh vegetable sandwich',
        descriptionOm: 'Sanduuchi kuduraa haaraa',
        descriptionAm: 'አዲስ የትክልት ሳንድዊች',
        price: 160,
        imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [breakfastSchedule],
        isActive: true,
        displayOrder: 4,
      },

      // ============================================================
      // MAIN DISHES / LAAQANA FI IRBAATA / ምሳ እና እራት
      // (item <-> meal schedule: Lunch & Dinner)
      // ============================================================
      {
        categoryIds: [mainDishesCat._id],
        name: 'Special Beef Tibs',
        nameEn: 'Special Beef Tibs',
        nameOm: 'Tibsii Ispeeshaal',
        nameAm: 'ስፔሻል ጥብስ',
        description: 'Premium beef tibs with vegetables',
        descriptionEn: 'Premium beef tibs with vegetables',
        descriptionOm: 'Tibsii sagaa ispeeshaal kuduraa',
        descriptionAm: 'ፕሪሚየም ጥብስ ከስጋ እና አትክልት',
        price: 500,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Siga_Tibs.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [lunchDinnerSchedule],
        isActive: true,
        displayOrder: 1,
      },
      {
        categoryIds: [mainDishesCat._id],
        name: 'Beef Tibs',
        nameEn: 'Beef Tibs',
        nameOm: 'Foon Tibsii',
        nameAm: 'የስጋ ጥብስ',
        description: 'Beef tibs with injera',
        descriptionEn: 'Beef tibs with injera',
        descriptionOm: 'Tibsii sagaa irreechaan',
        descriptionAm: 'የስጋ ጥብስ ከእርጋ',
        price: 430,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Siga_Tibs.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [lunchDinnerSchedule],
        isActive: true,
        displayOrder: 2,
      },
      {
        categoryIds: [mainDishesCat._id],
        name: 'Shiro Wot',
        nameEn: 'Shiro Wot',
        nameOm: 'Shiroo Dhadhaan',
        nameAm: 'ሽሮ በቅቤ',
        description: 'Chickpea stew with butter',
        descriptionEn: 'Chickpea stew with butter',
        descriptionOm: 'Shiroo dhadhaanitin',
        descriptionAm: 'ሽሮ በቅቤ የተዘጋጀ',
        price: 180,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Enjera_be_shiro_wot.jpg?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [lunchDinnerSchedule],
        isActive: true,
        displayOrder: 3,
      },
      {
        categoryIds: [mainDishesCat._id],
        name: 'Tegabino Shiro',
        nameEn: 'Tegabino Shiro',
        nameOm: 'Tegabiinoo',
        nameAm: 'ተጋቢኖ ሽሮ',
        description: 'Tegabino shiro with injera',
        descriptionEn: 'Tegabino shiro with injera',
        descriptionOm: 'Tegabiinoo irreechaan',
        descriptionAm: 'ተጋቢኖ ሽሮ ከእርጋ',
        price: 210,
        imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/%27Shiro%27.JPG?width=600',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [lunchDinnerSchedule],
        isActive: true,
        displayOrder: 4,
      },
      {
        categoryIds: [mainDishesCat._id],
        name: 'Pasta with Meat Sauce',
        nameEn: 'Pasta with Meat Sauce',
        nameOm: 'Paastaa Fooniin',
        nameAm: 'ፓስታ በስጋ',
        description: 'Pasta with rich meat sauce',
        descriptionEn: 'Pasta with rich meat sauce',
        descriptionOm: 'Paastaa fooniin',
        descriptionAm: 'ፓስታ በተጋጣ ስጋ ማረፊያ',
        price: 250,
        imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [lunchDinnerSchedule],
        isActive: true,
        displayOrder: 5,
      },
      {
        categoryIds: [mainDishesCat._id],
        name: 'Rice with Meat',
        nameEn: 'Rice with Meat',
        nameOm: 'Ruuza Fooniin',
        nameAm: 'ሩዝ በስጋ',
        description: 'Rice served with meat',
        descriptionEn: 'Rice served with meat',
        descriptionOm: 'Ruuza fooniin',
        descriptionAm: 'ሩዝ ከስጋ ጋር',
        price: 280,
        imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [lunchDinnerSchedule],
        isActive: true,
        displayOrder: 6,
      },
      {
        categoryIds: [mainDishesCat._id],
        name: 'Special Combo',
        nameEn: 'Special Combo',
        nameOm: 'Komboo Ispeeshaal',
        nameAm: 'ስፔሻል ኮምቦ',
        description: 'Special combo platter with assorted dishes',
        descriptionEn: 'Special combo platter with assorted dishes',
        descriptionOm: 'Komboo ispeeshaal',
        descriptionAm: 'ስፔሻል ኮምቦ ከተለያዩ ምግቦች',
        price: 650,
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=900&h=700&fit=crop&q=85',
        isAvailable: true,
        isAlwaysAvailable: false,
        mealScheduleIds: [lunchDinnerSchedule],
        isActive: true,
        displayOrder: 7,
      },
    ];

    await FoodItem.insertMany(allFoodItems);
    console.log(`Created ${allFoodItems.length} food items`);

    // ──────────────────────────────────────────────
    // SUMMARY
    // ──────────────────────────────────────────────
    console.log('\n========================================');
    console.log('  SEED DATA SUMMARY');
    console.log('========================================');
    console.log('Admin Login:');
    console.log('  Email:    admin@faarees.com');
    console.log('  Password: admin123');
    console.log('');
    console.log(`Meal Schedules:   ${mealPeriods.length}`);
    console.log(`Root Categories:  ${rootCategories.length}`);
    console.log(`Subcategories:    ${breakfastSubcategories.length}`);
    console.log(`Total Categories: ${rootCategories.length + breakfastSubcategories.length}`);
    console.log(`Food Items:       ${allFoodItems.length}`);
    console.log('');
    console.log('Menu Structure:');
    console.log('  1. Hot Drinks (is_always_available items) — 10 items');
    console.log('  2. Cold Drinks & Juices (is_always_available items) — 6 items');
    console.log('  3. Snacks & Fast Food — Always Available burger + Special Omelette (multi-category)');
    console.log('  4. Breakfast (06:00-11:30)');
    console.log('     - Traditional Breakfast — 6 items');
    console.log('     - Eggs & Sandwiches — 4 items (incl. Special Omelette)');
    console.log('  5. Main Dishes (11:30-22:30) — 7 items');
    console.log('');
    console.log('Many-to-Many Demonstrations:');
    console.log('  - Special Omelette -> Eggs & Sandwiches AND Snacks; Breakfast AND Lunch schedules');
    console.log('  - Tuna Sandwich -> Eggs & Sandwiches across Breakfast AND Lunch');
    console.log('');
    console.log('========================================');
    console.log('  Seed completed successfully!');
    console.log('========================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();