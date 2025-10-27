import React, { useState, useMemo } from 'react';

interface Restaurant {
  id: number;
  name: string;
  category: '外食 (Dine-in)' | '外帶 (Takeout)' | '速食 (Fast Food)' | '外食/外帶 (Dine-in/Takeout)';
}

const allCategories = ['外食 (Dine-in)', '外帶 (Takeout)', '速食 (Fast Food)', '外食/外帶 (Dine-in/Takeout)'] as const;
type Category = typeof allCategories[number];

const initialRestaurants: Restaurant[] = [
  { id: 1, name: "楊國福麻辣燙", category: "外食 (Dine-in)" },
  { id: 2, name: "Bentolious便當", category: "外帶 (Takeout)" },
  { id: 3, name: "Chick-n-tea便當", category: "外帶 (Takeout)" },
  { id: 4, name: "Chipotle", category: "速食 (Fast Food)" },
  { id: 5, name: "The Habit", category: "速食 (Fast Food)" },
  { id: 6, name: "Papa Johns pizza", category: "外帶 (Takeout)" },
  { id: 7, name: "海南雞飯", category: "外食/外帶 (Dine-in/Takeout)" },
  { id: 8, name: "Demiya咖喱飯", category: "外食/外帶 (Dine-in/Takeout)" },
  { id: 9, name: "鯉魚門", category: "外食/外帶 (Dine-in/Takeout)" },
  { id: 10, name: "KFC", category: "速食 (Fast Food)" },
  { id: 11, name: "Subway", category: "速食 (Fast Food)" },
  { id: 12, name: "Wendy's", category: "速食 (Fast Food)" },
  { id: 13, name: "Panda Express", category: "速食 (Fast Food)" },
  { id: 14, name: "Chick-fil-A", category: "速食 (Fast Food)" },
  { id: 15, name: "Jack in the box", category: "速食 (Fast Food)" },
  { id: 16, name: "Popeyes", category: "速食 (Fast Food)" },
  { id: 17, name: "Panera Bread", category: "外帶 (Takeout)" },
  { id: 18, name: "Kura Sushi", category: "外食 (Dine-in)" },
  { id: 19, name: "99 Ranch 燒臘便當", category: "外帶 (Takeout)" },
  { id: 20, name: "Mumu hot pot", category: "外食 (Dine-in)" },
  { id: 21, name: "Tasty Pot", category: "外食 (Dine-in)" },
  { id: 22, name: "Thai Basil Express", category: "外食 (Dine-in)" },
  { id: 23, name: "Shinkai Sushi", category: "外食 (Dine-in)" },
  { id: 24, name: "Hawaiian Poke", category: "外食 (Dine-in)" },
  { id: 25, name: "88 BaoBao", category: "外食 (Dine-in)" },
  { id: 26, name: "Hunan Chef", category: "外食 (Dine-in)" },
  { id: 27, name: "新中華-鍋包肉", category: "外帶 (Takeout)" },
  { id: 28, name: "Pho Dublin", category: "外食 (Dine-in)" },
  { id: 29, name: "Time Thai", category: "外食 (Dine-in)" },
];

export const App: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [newRestaurantName, setNewRestaurantName] = useState<string>('');
  const [newRestaurantCategory, setNewRestaurantCategory] = useState<Category>(allCategories[0]);

  const primaryCategories: Category[] = allCategories.filter(c => c !== '外食/外帶 (Dine-in/Takeout)');
  const [activeCategories, setActiveCategories] = useState<Category[]>(primaryCategories);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
        const category = restaurant.category;

        if (category === '外食/外帶 (Dine-in/Takeout)') {
            const dineInActive = activeCategories.includes('外食 (Dine-in)');
            const takeOutActive = activeCategories.includes('外帶 (Takeout)');
            return dineInActive || takeOutActive;
        } else {
            return activeCategories.includes(category);
        }
    });
  }, [restaurants, activeCategories]);

  const handleCategoryToggle = (category: Category) => {
    setActiveCategories(prevCategories => {
      if (prevCategories.includes(category)) {
        return prevCategories.filter(c => c !== category);
      } else {
        return [...prevCategories, category];
      }
    });
    setSelectedRestaurant(null);
  };

  const handleRoll = () => {
    const rollPool = filteredRestaurants;

    if (rollPool.length === 0) {
      setSelectedRestaurant("目前篩選下無餐廳可選！");
      return;
    }

    setIsRolling(true);
    setSelectedRestaurant("決定中...");

    let rollCount = 0;
    const interval = setInterval(() => {
      // Select a random restaurant during the "roll" from the filtered pool
      const randomIndex = Math.floor(Math.random() * rollPool.length);
      setSelectedRestaurant(rollPool[randomIndex].name);
      rollCount++;

      if (rollCount > 10) { // Stop after 15 fast "rolls"
        clearInterval(interval);
        setIsRolling(false);
        // Final selection is random
        const finalIndex = Math.floor(Math.random() * rollPool.length);
        setSelectedRestaurant(rollPool[finalIndex].name);
      }
    }, 40); // Quick interval for visual effect
  };

  // Function to handle adding a new restaurant
  const handleAddRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRestaurantName.trim() === '') return;

    const maxId = restaurants.length > 0 ? Math.max(...restaurants.map(r => r.id)) : 0;
    const newId = maxId + 1;

    setRestaurants([
        ...restaurants,
        {
            id: newId,
            name: newRestaurantName.trim(),
            category: newRestaurantCategory
        }
    ]);
    setNewRestaurantName('');
  };

  // Function to handle removing a restaurant
  const handleRemoveRestaurant = (id: number) => {
    const restaurantToRemove = restaurants.find(r => r.id === id);
    setRestaurants(restaurants.filter(r => r.id !== id));

    // 如果移除的是當前選中的餐廳，則清除選中狀態
    if (selectedRestaurant && restaurantToRemove?.name === selectedRestaurant) {
        setSelectedRestaurant(null);
    }
  };

  // Tailwind Classes for Rolling Button
  const rollButtonClasses = isRolling
    ? "bg-red-400 hover:bg-red-500 cursor-not-allowed transform duration-150 shadow-inner"
    : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-xl hover:shadow-2xl transition duration-300 ease-in-out hover:scale-105";

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex justify-center items-center font-sans">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-6 md:p-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 text-center mb-2 tracking-tight">
          🍜 Dublin 5400 晚餐 命運轉盤 🎲
        </h1>
        <p className="text-center text-gray-500 mb-8">
          讓幸運骰子決定您今天要吃什麼！
        </p>

        {/* Selection Display */}
        <div className="mb-8 p-6 bg-indigo-50 border-4 border-indigo-200 rounded-lg text-center">
          <p className="text-lg text-gray-600 font-medium">今天吃：</p>
          <div className={`text-4xl sm:text-5xl font-black mt-2 text-indigo-800 transition-all duration-500 ease-in-out ${isRolling ? 'animate-pulse' : ''}`}>
            {selectedRestaurant || "按下骰子按鈕開始決定"}
          </div>
        </div>

        {/* Roll Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleRoll}
            disabled={isRolling || filteredRestaurants.length === 0}
            className={`w-full max-w-sm text-white font-bold py-4 px-6 rounded-full focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg ${rollButtonClasses}`}
          >
            {isRolling ? "擲骰決定中..." : `開始擲骰！ (選項 ${filteredRestaurants.length} 間)`}
          </button>
        </div>

        <hr className="mb-8 border-gray-200" />

        {/* --- 類別篩選器 --- */}
        <h2 className="text-xl font-bold text-gray-700 mb-3">篩選類型</h2>
        {/* 調整為 grid-cols-3，並過濾掉 '外食/外帶' 類別的勾選框 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 rounded-lg border">
          {allCategories
            .filter(category => category !== '外食/外帶 (Dine-in/Takeout)') // 移除 '外食/外帶' 的選項
            .map((category) => (
            <label key={category} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition duration-150">
              <input
                type="checkbox"
                checked={activeCategories.includes(category)}
                onChange={() => handleCategoryToggle(category)}
                disabled={isRolling}
                className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
              />
              <span className="text-gray-700 font-medium text-sm md:text-base">{category}</span>
            </label>
          ))}
        </div>
        <hr className="mb-8 border-gray-200" />


        {/* Restaurant List Management */}
        <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center">
            餐廳清單管理 (總計 {restaurants.length} 間)
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        </h2>

        {/* Add New Restaurant Form */}
        <form onSubmit={handleAddRestaurant} className="mb-6 flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={newRestaurantName}
            onChange={(e) => setNewRestaurantName(e.target.value)}
            placeholder="新增餐廳名稱"
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            disabled={isRolling}
          />
          <select
            value={newRestaurantCategory}
            onChange={(e) => setNewRestaurantCategory(e.target.value as Category)}
            className="p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isRolling}
          >
            {allCategories.map(category => (
                <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button
            type="submit"
            className="shrink-0 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow transition duration-200 disabled:bg-gray-400"
            disabled={isRolling || newRestaurantName.trim() === ''}
          >
            新增
          </button>
        </form>

        {/* Restaurant List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                // 使用樣式來突出顯示非活動類別的餐廳
                className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 shadow-sm transition duration-150 ${
                    activeCategories.includes(restaurant.category) ||
                    (restaurant.category === '外食/外帶 (Dine-in/Takeout)' &&
                     (activeCategories.includes('外食 (Dine-in)') || activeCategories.includes('外帶 (Takeout)')))
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'bg-gray-200 opacity-60'}`}
              >
                <span className="text-gray-700 font-medium">
                    <span className="font-light text-sm text-indigo-500 mr-2">[{restaurant.category.split(' ')[0]}]</span>
                    {restaurant.name}
                </span>
                <button
                  onClick={() => handleRemoveRestaurant(restaurant.id)}
                  className="text-red-500 hover:text-red-700 transition duration-150 p-1 rounded-full hover:bg-red-100"
                  disabled={isRolling}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 italic p-4 border border-dashed rounded-lg">清單是空的！請新增一些餐廳來開始擲骰。</p>
          )}
        </div>

      </div>
    </div>
  );
};
