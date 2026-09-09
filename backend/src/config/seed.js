const mongoose = require('mongoose');
const Category = require('../modules/menu/category/category.model');
const FoodItem = require('../modules/menu/food/food.model');
const MealPeriod = require('../modules/menu/meal-period/meal-period.model');
const { User } = require('../modules/users/user.model');

const MONGODB_URI = 'mongodb+srv://yihune908_db_user:Jy21YOv2mReY7fQK@cluster0.p78x026.mongodb.net/faarees_menu_db?appName=Cluster0';

// ---------------------------------------------------------------------------
// Verified image URLs (never guess — every link below was checked).
// - Unsplash photos return HTTP 200.
// - Commons files use Special:FilePath (302 -> 200); /thumb/ 600px URLs return 400.
// ---------------------------------------------------------------------------
const IMG = {
  tea: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=900&h=700&fit=crop&q=85',
  milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=900&h=700&fit=crop&q=85',
  yogurt: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&h=700&fit=crop&q=85',
  macchiato: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=900&h=700&fit=crop&q=85',
  // Traditional buna: jebena pouring into sini (cini) cups — verified Commons file.
  coffee: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ethiopian_coffee_ceremony_jebena_and_finjan.jpg?width=600',
  soda: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=900&h=700&fit=crop&q=85',
  // Bottled water (plastic bottles, Ethiopian-style retail presentation) — verified HTTP 200.
  waterSmall: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=900&h=700&fit=crop&q=85',
  water: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900&h=700&fit=crop&q=85',
  waterLarge: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=900&h=700&fit=crop&q=85',
  eggs: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&h=700&fit=crop&q=85',
  sandwich: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=900&h=700&fit=crop&q=85',
  pasta: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&h=700&fit=crop&q=85',
  rice: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900&h=700&fit=crop&q=85',
  // Ethiopian-style ful: bowl of ful with bread, tomatoes/pickles on the side — verified Commons files.
  fulSpecial: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ful_medames_(cropped).jpg?width=600',
  fulNormal: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ful_Medames.JPG?width=600',
  // Chechebsa (kita firfir): torn kita with spiced butter/berbere — verified Commons file.
  chechebsa: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chipchipsa_Ethiopian_dish_2014.jpg?width=600',
  dryFirfir: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kitcha_fit_fit.png?width=600',
  beefFirfir: 'https://commons.wikimedia.org/wiki/Special:FilePath/Firfir.JPG?width=600',
  // Beef tibs served on injera platter — verified Commons file.
  tibs: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tibs_and_Injera.jpg?width=600',
  shiro: 'https://commons.wikimedia.org/wiki/Special:FilePath/Enjera_be_shiro_wot.jpg?width=600',
  tegabino: 'https://commons.wikimedia.org/wiki/Special:FilePath/%27Shiro%27.JPG?width=600',
  // Mixed combo platter (beyaynetu-style assorted dishes on injera) — verified Commons file.
  combo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Non-fasting_Beyaynetu_in_Yod_Abyssinia_1.jpg?width=600',
};

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // ──────────────────────────────────────────────
    // STEP 1: WIPE ALL MENU DATA (menu tables only)
    // TRUNCATE item_meal_schedules, item_categories,
    //         category_meal_schedules, menu_items,
    //         categories, meal_schedules ... CASCADE
    // ──────────────────────────────────────────────
    console.log('Wiping existing menu data...');
    await FoodItem.deleteMany({});
    await Category.deleteMany({});
    await MealPeriod.deleteMany({});
    console.log('All menu data cleared.');

    // ──────────────────────────────────────────────
    // STEP 2: ENSURE ADMIN USER (users NOT wiped)
    // ──────────────────────────────────────────────
    const existingAdmin = await User.findOne({ email: 'admin@faarees.com' });
    if (!existingAdmin) {
      await User.create({
        name: 'Admin',
        email: 'admin@faarees.com',
        passwordHash: 'admin123',
        role: 'OWNER',
        isActive: true,
      });
      console.log('Admin user created: admin@faarees.com');
    } else {
      console.log('Admin user already exists: admin@faarees.com');
    }

    // ──────────────────────────────────────────────
    // STEP 3: MEAL SCHEDULES / TIME WINDOWS
    // ──────────────────────────────────────────────
    console.log('Creating meal schedules...');
    const [breakfastPeriod, lunchDinnerPeriod] = await MealPeriod.insertMany([
      {
        name: 'BREAKFAST',
        nameEn: 'Breakfast',
        nameOm: 'Ciree',
        nameAm: 'ቁርስ',
        startTime: '06:00',
        endTime: '11:30',
        isActive: true,
      },
      {
        name: 'LUNCH_DINNER',
        nameEn: 'Lunch & Dinner',
        nameOm: 'Haŋaa fi Fajjii',
        nameAm: 'ከፋየ እና ማታ ምግብ',
        startTime: '11:30',
        endTime: '22:30',
        isActive: true,
      },
    ]);
    console.log(`Created ${breakfastPeriod ? 2 : 0} meal schedules`);

    // ──────────────────────────────────────────────
    // STEP 4: BASE CATEGORIES (flat, 5 categories)
    // ──────────────────────────────────────────────
    console.log('Creating categories...');
    const categories = await Category.insertMany([
      {
        name: 'HOT DRINKS',
        nameEn: 'Hot Drinks',
        nameOm: 'Shaayii fi Buna',
        nameAm: 'ትኩስ ነገሮች',
        mealScheduleIds: [],
        displayOrder: 1,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'COLD DRINKS & JUICES',
        nameEn: 'Cold Drinks & Juices',
        nameOm: 'Dhugaatii Qabbanaawaa fi Juusii',
        nameAm: 'ቀዝቃዛ ነገሮች እና ጁስ',
        mealScheduleIds: [],
        displayOrder: 2,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'SNACKS & FAST FOOD',
        nameEn: 'Snacks & Fast Food',
        nameOm: 'Makkasaa fi Faasfudii',
        nameAm: 'መክሰስ እና ፋስት ፉድ',
        mealScheduleIds: [],
        displayOrder: 3,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'BREAKFAST ITEMS',
        nameEn: 'Breakfast Items',
        nameOm: 'Nyaata Ciree',
        nameAm: 'የቁርስ ምግቦች',
        mealScheduleIds: [breakfastPeriod._id],
        displayOrder: 4,
        isActive: true,
        isHidden: false,
      },
      {
        name: 'MAIN DISHES',
        nameEn: 'Main Dishes',
        nameOm: 'Nyaata Gudaadha (Laaqana/Irbaata)',
        nameAm: 'ዋና ዋና ምግቦች',
        mealScheduleIds: [lunchDinnerPeriod._id],
        displayOrder: 5,
        isActive: true,
        isHidden: false,
      },
    ]);

    const [hotCat, coldCat, snacksCat, breakfastCat, mainCat] = categories;
    console.log(`Created ${categories.length} categories`);

    // Helper: build a food item doc.
    const food = ({ catId, nameEn, nameOm, nameAm, price, imageUrl, desc, descOm, descAm, always, schedules = [], order }) => ({
      categoryIds: [catId],
      name: nameEn,
      nameEn,
      nameOm,
      nameAm,
      description: desc,
      descriptionEn: desc,
      descriptionOm: descOm,
      descriptionAm: descAm,
      price,
      imageUrl,
      isAvailable: true,
      isAlwaysAvailable: always,
      mealScheduleIds: schedules,
      isActive: true,
      displayOrder: order,
    });

    // ──────────────────────────────────────────────
    // STEP 5: HOT DRINKS — SHAAYII FI BUNA — ትኩስ ነገሮች
    // (Always Available, no schedules)
    // ──────────────────────────────────────────────
    const hotDrinks = [
      food({ catId: hotCat._id, nameEn: 'Lemon Tea', nameOm: 'Shaayii Loomii', nameAm: 'ሻይ በሎሚ', price: 25, imageUrl: IMG.tea, desc: 'Fresh lemon tea', descOm: 'Shaayii loomii haaraa', descAm: 'አዲስ ሻይ በሎሚ', always: true, order: 1 }),
      food({ catId: hotCat._id, nameEn: 'Orange Tea', nameOm: 'Shaayii Burtukaana', nameAm: 'ሻይ በብርቱካን', price: 45, imageUrl: IMG.tea, desc: 'Fresh orange tea', descOm: 'Shaayii burtukaana haaraa', descAm: 'አዲስ ሻይ በብርቱካን', always: true, order: 2 }),
      food({ catId: hotCat._id, nameEn: 'Pineapple Tea', nameOm: 'Shaayii Ananaasa', nameAm: 'ሻይ በአናናስ', price: 45, imageUrl: IMG.tea, desc: 'Fresh pineapple tea', descOm: 'Shaayii ananaasa haaraa', descAm: 'አዲስ ሻይ በአናናስ', always: true, order: 3 }),
      food({ catId: hotCat._id, nameEn: 'Mango Tea', nameOm: 'Shaayii Maangoo', nameAm: 'ሻይ በሜንጎ', price: 45, imageUrl: IMG.tea, desc: 'Fresh mango tea', descOm: 'Shaayii maangoo haaraa', descAm: 'አዲስ ሻይ በሜንጎ', always: true, order: 4 }),
      food({ catId: hotCat._id, nameEn: 'Ginger Tea (Qashar)', nameOm: 'Qasharii / Shaayii Zinjibilaa', nameAm: 'ቀሸር / የዝንጅብል ሻይ', price: 45, imageUrl: IMG.tea, desc: 'Traditional ginger tea', descOm: 'Qashar / shaayii zinjibilaa aadaa', descAm: 'ባሕርያዊ የዝንጅብል ሻይ', always: true, order: 5 }),
      food({ catId: hotCat._id, nameEn: 'Special Tea', nameOm: 'Shaayii Ispeeshaala', nameAm: 'ስፔሻል ሻይ', price: 70, imageUrl: IMG.tea, desc: 'Special blend tea', descOm: 'Shaayii ispeeshaala', descAm: 'ስፔሻል ሻይ', always: true, order: 6 }),
      food({ catId: hotCat._id, nameEn: 'Cinnamon Spiced Tea', nameOm: 'Shaayii Ispriisaa', nameAm: 'ስፕሪስ ሻይ', price: 75, imageUrl: IMG.tea, desc: 'Cinnamon flavored tea', descOm: 'Shaayii ispriisaa', descAm: 'ስፕሪስ ሻይ', always: true, order: 7 }),
      food({ catId: hotCat._id, nameEn: 'Fresh Milk', nameOm: 'Aannan', nameAm: 'ወተት', price: 45, imageUrl: IMG.milk, desc: 'Fresh warm milk', descOm: 'Aannan haaraa', descAm: 'አዲስ ሞቅ ወተት', always: true, order: 8 }),
      food({ catId: hotCat._id, nameEn: 'Milk with Peanut', nameOm: 'Aannan Loziitiin', nameAm: 'ወተት በለውዝ', price: 55, imageUrl: IMG.milk, desc: 'Milk served with peanut', descOm: 'Aannan loziitiin', descAm: 'ወተት ከለውዝ ጋር', always: true, order: 9 }),
      food({ catId: hotCat._id, nameEn: 'Milk with Banana', nameOm: 'Aannan Muuziitiin', nameAm: 'ወተት በሙዝ', price: 60, imageUrl: IMG.milk, desc: 'Milk served with banana', descOm: 'Aannan muuziitiin', descAm: 'ወተት ከሙዝ ጋር', always: true, order: 10 }),
      food({ catId: hotCat._id, nameEn: 'Macchiato', nameOm: 'Maakiyatoo', nameAm: 'ማኪያቶ', price: 50, imageUrl: IMG.macchiato, desc: 'Espresso with milk foam', descOm: 'Ispresoootii aannan', descAm: 'ኢስፕሬሶ ከወተት ፎም', always: true, order: 11 }),
      food({ catId: hotCat._id, nameEn: 'Yogurt (Ergoo)', nameOm: 'Ergoo', nameAm: 'እርጎ', price: 80, imageUrl: IMG.yogurt, desc: 'Fresh yogurt, served cold', descOm: 'Ergoo qabbanaawa', descAm: 'አዲስ እርጎ በቀዝቃዛ', always: true, order: 12 }),
      food({ catId: hotCat._id, nameEn: 'Traditional Coffee (Buna Jabanaa)', nameOm: 'Buna Jabanaa', nameAm: 'የጀበና ቡና', price: 35, imageUrl: IMG.coffee, desc: 'Traditional Ethiopian coffee ceremony', descOm: 'Buna jabanaa Itoophiyaa aadaa', descAm: 'ባሕርያዊ የኢትዮጵያ ቡና ሥነ ሥርዓት', always: true, order: 13 }),
      food({ catId: hotCat._id, nameEn: 'Black Coffee', nameOm: 'Buna Qullaala', nameAm: 'ጥቁር ቡና', price: 15, imageUrl: IMG.coffee, desc: 'Strong black coffee', descOm: 'Buna qullaala jabaa', descAm: 'ጠንካራ ጥቁር ቡና', always: true, order: 14 }),
      food({ catId: hotCat._id, nameEn: 'Half Black Coffee', nameOm: 'Buna Qullaala Gammekka', nameAm: 'ግማሽ ጥቁር ቡና', price: 20, imageUrl: IMG.coffee, desc: 'Half black coffee with milk', descOm: 'Buna qullaala gammekka aannan', descAm: 'ግማሽ ጥቁር ቡና ከወተት', always: true, order: 15 }),
    ];

    // ──────────────────────────────────────────────
    // STEP 6: COLD DRINKS & JUICES
    // (Always Available, no schedules)
    // ──────────────────────────────────────────────
    const coldDrinks = [
      food({ catId: coldCat._id, nameEn: 'Soft Drinks (Coca / Fanta / Sprite)', nameOm: 'Dhugaatii Lasiilaasaa', nameAm: 'ለስላሳ መጠጦች', price: 50, imageUrl: IMG.soda, desc: 'Assorted soft drinks', descOm: 'Dhugaatii lasiilaasaa', descAm: 'ለስላሳ መጠጦች', always: true, order: 1 }),
      food({ catId: coldCat._id, nameEn: 'Mineral Water 2L', nameOm: 'Bishaan Boonsaa 2L (Amboo)', nameAm: '2 ሊትር የምቦ ውሃ', price: 80, imageUrl: IMG.waterLarge, desc: 'Ambo natural mineral water, 2 liters', descOm: 'Amboo bishaan boonsaa litira 2', descAm: '2 ሊትር አምቦ ተፈጥሯዊ የምቦ ውሃ', always: true, order: 2 }),
      food({ catId: coldCat._id, nameEn: 'Mineral Water 1L', nameOm: 'Bishaan Boonsaa 1L (Amboo)', nameAm: '1 ሊትር የምቦ ውሃ', price: 50, imageUrl: IMG.water, desc: 'Ambo natural mineral water, 1 liter', descOm: 'Amboo bishaan boonsaa litira 1', descAm: '1 ሊትር አምቦ ተፈጥሯዊ ውሃ', always: true, order: 3 }),
      food({ catId: coldCat._id, nameEn: 'Mineral Water 0.5L', nameOm: 'Bishaan Boonsaa 0.5L (Amboo)', nameAm: '0.5 ሊትር የምቦ ውሃ', price: 30, imageUrl: IMG.waterSmall, desc: 'Ambo natural mineral water, half liter', descOm: 'Amboo bishaan boonsaa gammekka', descAm: '0.5 ሊትር አምቦ ተፈጥሯዊ ውሃ', always: true, order: 4 }),
      food({ catId: coldCat._id, nameEn: 'Ambo Mineral Water', nameOm: 'Amboo Filebaraa', nameAm: 'አምቦ የምቦ ውሃ', price: 45, imageUrl: IMG.water, desc: 'Ambo natural mineral water', descOm: 'Amboo filebaraa', descAm: 'አምቦ ተፈጥሯዊ ብራንድ ውሃ', always: true, order: 5 }),
      food({ catId: coldCat._id, nameEn: 'Novida', nameOm: 'Noviidaa', nameAm: 'ኖቪዳ', price: 50, imageUrl: IMG.soda, desc: 'Refreshing fruit flavored drink', descOm: 'Dhugaatii qabbanaawaa', descAm: 'ለሚያርፍ ፍራፍሬ መጠጥ', always: true, order: 6 }),
    ];

    // ──────────────────────────────────────────────
    // STEP 7: BREAKFAST ITEMS — CIREE — የቁርስ ምግቦች
    // (Time restricted: Breakfast 06:00-11:30)
    // ──────────────────────────────────────────────
    const breakfastItems = [
      food({ catId: breakfastCat._id, nameEn: 'Special Ful (Ful ispeeshaala)', nameOm: 'Fuul Ispeeshaala', nameAm: 'ስፔሻል ፉል', price: 190, imageUrl: IMG.fulSpecial, desc: 'Special ful with boiled egg, tomato, chili and bread', descOm: 'Fuul ispeeshaala istaar, timaatimii fi daaboo wajjin', descAm: 'ስፔሻል ፉል ከእንቁላል፣ ቲማቲምና ዳቦ ጋር', always: false, schedules: [breakfastPeriod._id], order: 1 }),
      food({ catId: breakfastCat._id, nameEn: 'Normal Ful (Fuul idilee)', nameOm: 'Fuul Idilee', nameAm: 'መደበኛ ፉል', price: 140, imageUrl: IMG.fulNormal, desc: 'Ful with tomato salad and fresh bread', descOm: 'Fuul idilee timaatimii fi daaboon', descAm: 'መደበኛ ፉል ከቲማቲምና ዳቦ ጋር', always: false, schedules: [breakfastPeriod._id], order: 2 }),
      food({ catId: breakfastCat._id, nameEn: 'Chechebsa with Butter', nameOm: 'Cacabsaa Dhadhaan', nameAm: 'ጨጨብሳ በቅቤ', price: 190, imageUrl: IMG.chechebsa, desc: 'Kita firfir with spiced butter and berbere', descOm: 'Cacabsaa dhadhaa fi berebereen', descAm: 'ጨጨብሳ በቅቤና በርበሬ የተዘጋጀ', always: false, schedules: [breakfastPeriod._id], order: 3 }),
      food({ catId: breakfastCat._id, nameEn: 'Chechebsa with Honey & Butter', nameOm: 'Cacabsaa Dammaa fi Dhadhaan', nameAm: 'ጨጨብሳ በቅቤ እና ማር', price: 250, imageUrl: IMG.chechebsa, desc: 'Chechebsa with honey and spiced butter', descOm: 'Cacabsaa dammaa fi dhadhaanitin', descAm: 'ጨጨብሳ በቅቤና ማር የተዘጋጀ', always: false, schedules: [breakfastPeriod._id], order: 4 }),
      food({ catId: breakfastCat._id, nameEn: 'Dry Beef Firfir (Qanta)', nameOm: 'Qaantaa Firfir', nameAm: 'ቋንጣ ፍርፍር', price: 320, imageUrl: IMG.dryFirfir, desc: 'Dry beef firfir (Qanta) with injera', descOm: 'Qaantaa firfir irreechaan', descAm: 'ቋንጣ ፍርፍር ከእንጀራ ጋር', always: false, schedules: [breakfastPeriod._id], order: 5 }),
      food({ catId: breakfastCat._id, nameEn: 'Beef Firfir', nameOm: 'Foon Firfir', nameAm: 'የስጋ ፍርፍር', price: 300, imageUrl: IMG.beefFirfir, desc: 'Beef firfir with injera', descOm: 'Foon firfir irreechaan', descAm: 'የስጋ ፍርፍር ከእንጀራ ጋር', always: false, schedules: [breakfastPeriod._id], order: 6 }),
      food({ catId: breakfastCat._id, nameEn: 'Special Omelette', nameOm: 'Omeletii Ispeeshaala', nameAm: 'ስፔሻል ኦሜሌት', price: 160, imageUrl: IMG.eggs, desc: 'Special omelette with vegetables', descOm: 'Omeletii ispeeshaala kuduraa', descAm: 'ስፔሻል ኦሜሌት ከአትክልት ጋር', always: false, schedules: [breakfastPeriod._id], order: 7 }),
      food({ catId: breakfastCat._id, nameEn: 'Scrambled Eggs with Bread', nameOm: 'Inqulaala Dhaabbataa Daaboon', nameAm: 'እንቁላል በዳቦ', price: 140, imageUrl: IMG.eggs, desc: 'Scrambled eggs with fresh bread', descOm: 'Inqulaala dhaabbataa daaboo haaraatin', descAm: 'እንቁላል ከአዲስ ዳቦ ጋር', always: false, schedules: [breakfastPeriod._id], order: 8 }),
      food({ catId: breakfastCat._id, nameEn: 'Tuna Sandwich', nameOm: 'Sanduuchii Tunaa', nameAm: 'ቱና ሳንድዊች', price: 270, imageUrl: IMG.sandwich, desc: 'Fresh tuna sandwich', descOm: 'Sanduuchii tunaa haaraa', descAm: 'አዲስ ቱና ሳንድዊች', always: false, schedules: [breakfastPeriod._id], order: 9 }),
      food({ catId: breakfastCat._id, nameEn: 'Veggie Sandwich', nameOm: 'Sanduuchii Kuduraa', nameAm: 'የአትክልት ሳንድዊች', price: 160, imageUrl: IMG.sandwich, desc: 'Fresh vegetable sandwich', descOm: 'Sanduuchii kuduraa haaraa', descAm: 'አዲስ የአትክልት ሳንድዊች', always: false, schedules: [breakfastPeriod._id], order: 10 }),
    ];

    // ──────────────────────────────────────────────
    // STEP 8: MAIN DISHES — LAAQANA/Irbaata — ዋና ዋና ምግቦች
    // (Time restricted: Lunch & Dinner 11:30-22:30)
    // ──────────────────────────────────────────────
    const mainDishes = [
      food({ catId: mainCat._id, nameEn: 'Special Beef Tibs', nameOm: 'Tibsii Ispeeshaala', nameAm: 'ስፔሻል ጥብስ', price: 500, imageUrl: IMG.tibs, desc: 'Premium beef tibs served on injera', descOm: 'Tibsii ispeeshaala irreechaan', descAm: 'ስፔሻል ጥብስ በእንጀራ ላይ', always: false, schedules: [lunchDinnerPeriod._id], order: 1 }),
      food({ catId: mainCat._id, nameEn: 'Beef Tibs', nameOm: 'Foon Tibsii', nameAm: 'የስጋ ጥብስ', price: 430, imageUrl: IMG.tibs, desc: 'Beef tibs with injera', descOm: 'Foon tibsii irreechaan', descAm: 'የስጋ ጥብስ ከእንጀራ ጋር', always: false, schedules: [lunchDinnerPeriod._id], order: 2 }),
      food({ catId: mainCat._id, nameEn: 'Shiro Wot with Butter', nameOm: 'Shiroo Dhadhaan', nameAm: 'ሽሮ በቅቤ', price: 180, imageUrl: IMG.shiro, desc: 'Chickpea stew with butter', descOm: 'Shiroo dhadhaanitin', descAm: 'ሽሮ በቅቤ የተዘጋጀ', always: false, schedules: [lunchDinnerPeriod._id], order: 3 }),
      food({ catId: mainCat._id, nameEn: 'Tegabino Shiro', nameOm: 'Tegabiinoo Shiroo', nameAm: 'ተጋቢኖ ሽሮ', price: 210, imageUrl: IMG.tegabino, desc: 'Tegabino shiro with injera', descOm: 'Tegabiinoo shiroo irreechaan', descAm: 'ተጋቢኖ ሽሮ ከእንጀራ ጋር', always: false, schedules: [lunchDinnerPeriod._id], order: 4 }),
      food({ catId: mainCat._id, nameEn: 'Pasta with Meat Sauce', nameOm: 'Paastaa Fooniin', nameAm: 'ፓስታ በስጋ', price: 250, imageUrl: IMG.pasta, desc: 'Pasta with rich meat sauce', descOm: 'Paastaa fooniin', descAm: 'ፓስታ ከስጋ ሾርባ ጋር', always: false, schedules: [lunchDinnerPeriod._id], order: 5 }),
      food({ catId: mainCat._id, nameEn: 'Rice with Meat', nameOm: 'Ruuza Fooniin', nameAm: 'ሩዝ በስጋ', price: 280, imageUrl: IMG.rice, desc: 'Rice served with meat', descOm: 'Ruuza fooniin', descAm: 'ሩዝ ከስጋ ጋር', always: false, schedules: [lunchDinnerPeriod._id], order: 6 }),
      food({ catId: mainCat._id, nameEn: 'Special Combo (Beyaynetu)', nameOm: 'Komboo Ispeeshaala (Baayenetuu)', nameAm: 'ስፔሻል ኮምቦ (በያይነቱ)', price: 650, imageUrl: IMG.combo, desc: 'Assorted Ethiopian dishes on injera platter', descOm: 'Nyaata adda addaa irreecha irratti', descAm: 'ስፔሻል ኮምቦ በእንጀራ ላይ የተለያዩ ምግቦች', always: false, schedules: [lunchDinnerPeriod._id], order: 7 }),
    ];

    const allFoodItems = [...hotDrinks, ...coldDrinks, ...breakfastItems, ...mainDishes];
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
    console.log(`Meal Schedules:  2 (BREAKFAST 06:00-11:30 | LUNCH_DINNER 11:30-22:30)`);
    console.log(`Categories:      ${categories.length} (incl. empty Snacks & Fast Food)`);
    console.log(`Food Items:      ${allFoodItems.length}`);
    console.log('  Hot Drinks:           15');
    console.log('  Cold Drinks & Juices:  6');
    console.log('  Breakfast Items:      10');
    console.log('  Main Dishes:           7');
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