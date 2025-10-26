import React, { useState } from 'react';

// Define the type for a single restaurant
interface Restaurant {
  id: number;
  name: string;
}

// Initial list of restaurants
const initialRestaurants: Restaurant[] = [
  { id: 1, name: "義大利麵店 (Pasta)" },
  { id: 2, name: "日式拉麵 (Ramen)" },
  { id: 3, name: "台式小吃 (Taiwanese)" },
  { id: 4, name: "素食/沙拉 (Veggie/Salad)" },
  { id: 5, name: "美式漢堡 (Burger)" },
  { id: 6, name: "泰式料理 (Thai Food)" },
];

// Named export for the main component
export const App: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [newRestaurantName, setNewRestaurantName] = useState<string>('');

  // Function to handle the dice roll simulation
  const handleRoll = () => {
    if (restaurants.length === 0) {
      setSelectedRestaurant("請先新增餐廳！");
      return;
    }

    setIsRolling(true);
    setSelectedRestaurant("決定中...");

    // Simulate rolling animation (shaking/delay)
    let rollCount = 0;
    const interval = setInterval(() => {
      // Select a random restaurant during the "roll"
      const randomIndex = Math.floor(Math.random() * restaurants.length);
      setSelectedRestaurant(restaurants[randomIndex].name);
      rollCount++;

      if (rollCount > 15) { // Stop after 15 fast "rolls"
        clearInterval(interval);
        setIsRolling(false);
        // Final selection is random
        const finalIndex = Math.floor(Math.random() * restaurants.length);
        setSelectedRestaurant(restaurants[finalIndex].name);
      }
    }, 80); // Quick interval for visual effect
  };

  // Function to handle adding a new restaurant
  const handleAddRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRestaurantName.trim() === '') return;

    const newId = Math.max(...restaurants.map(r => r.id), 0) + 1;
    setRestaurants([...restaurants, { id: newId, name: newRestaurantName.trim() }]);
    setNewRestaurantName('');
  };

  // Function to handle removing a restaurant
  const handleRemoveRestaurant = (id: number) => {
    setRestaurants(restaurants.filter(r => r.id !== id));
    if (selectedRestaurant && restaurants.find(r => r.id === id)?.name === selectedRestaurant) {
        setSelectedRestaurant(null); // Clear selection if the removed one was selected
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
          🍜 午餐/晚餐 命運轉盤 🎲
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
            disabled={isRolling || restaurants.length === 0}
            className={`w-full max-w-sm text-white font-bold py-4 px-6 rounded-full focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg ${rollButtonClasses}`}
          >
            {isRolling ? "擲骰決定中..." : "開始擲骰！"}
          </button>
        </div>

        <hr className="mb-8 border-gray-200" />

        {/* Restaurant List Management */}
        <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center">
            餐廳清單管理 ({restaurants.length} 間)
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        </h2>

        {/* Add New Restaurant Form */}
        <form onSubmit={handleAddRestaurant} className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newRestaurantName}
            onChange={(e) => setNewRestaurantName(e.target.value)}
            placeholder="新增餐廳名稱 (例如：星巴克)"
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            disabled={isRolling}
          />
          <button
            type="submit"
            className="shrink-0 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow transition duration-200 disabled:bg-gray-400"
            disabled={isRolling || newRestaurantName.trim() === ''}
          >
            新增
          </button>
        </form>

        {/* Restaurant List */}
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm transition duration-150 hover:bg-gray-100"
              >
                <span className="text-gray-700 font-medium">{restaurant.name}</span>
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
