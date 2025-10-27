import React, { useState, useMemo, useEffect } from 'react';

// 從標準 Firebase 套件路徑引入
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
    getFirestore,
    collection,
    query,
    addDoc,
    onSnapshot,
    deleteDoc,
    doc,
    DocumentData,
    serverTimestamp,
    setLogLevel // 引入 setLogLevel
} from 'firebase/firestore';

// 啟用 Firebase 日誌，幫助調試
setLogLevel('debug');

// --- 全域變數聲明 (Canvas 環境提供) ---
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

// --- 類型定義 ---
type Category = '外食 (Dine-in)' | '外帶 (Takeout)' | '速食 (Fast Food)' | '外食/外帶 (Dine-in/Takeout)';
const allCategories: Category[] = ['外食 (Dine-in)', '外帶 (Takeout)', '速食 (Fast Food)', '外食/外帶 (Dine-in/Takeout)'];

// Firestore Document Structure
interface RestaurantData extends DocumentData {
  name: string;
  category: Category;
  timestamp?: any;
}

// Restaurant structure for React state
interface Restaurant extends RestaurantData {
  id: string;
}

// -----------------------------------------------------
// 1. FIREBASE 初始化與配置
// -----------------------------------------------------

// 用戶提供的 Firebase 配置作為備用 (當 Canvas 環境變數不可用時)
const fallbackFirebaseConfig = {
  apiKey: "AIzaSyCR8vTPzyfCveKLVnv4bYA_rGo_G7Du1mM",
  authDomain: "test-gemini-2429e.firebaseapp.com",
  projectId: "test-gemini-2429e",
  storageBucket: "test-gemini-2429e.firebasestorage.app",
  messagingSenderId: "986136828585",
  appId: "1:986136828585:web:6397acf38061d82011a7b8",
  measurementId: "G-GPWRXE3FM0"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// 優先使用 Canvas 環境提供的配置
let firebaseConfig = fallbackFirebaseConfig;

if (typeof __firebase_config !== 'undefined' && __firebase_config.trim() !== '') {
  try {
    const envConfig = JSON.parse(__firebase_config);
    if (envConfig && envConfig.projectId) {
      firebaseConfig = envConfig;
    }
  } catch (e) {
    console.error("Error parsing __firebase_config, falling back to user-provided config.", e);
  }
}

// 初始化 Firebase 應用程式
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// 設定餐廳資料儲存路徑 (公共路徑)
const RESTAURANTS_PATH = `/artifacts/${appId}/public/data/restaurants`;
const restaurantsCollection = collection(db, RESTAURANTS_PATH);


// Named export for the main component
export const App: React.FC = () => {
  // 數據狀態
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  // 表單狀態
  const [newRestaurantName, setNewRestaurantName] = useState<string>('');
  const [newRestaurantCategory, setNewRestaurantCategory] = useState<Category>(allCategories[0]);

  // 篩選狀態
  const primaryCategories: Category[] = allCategories.filter(c => c !== '外食/外帶 (Dine-in/Takeout)');
  const [activeCategories, setActiveCategories] = useState<Category[]>(primaryCategories);

  // Firebase 狀態
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 使用單一錯誤狀態來管理所有 Firebase 相關錯誤
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // -----------------------------------------------------
  // 2. 認證與資料監聽 Effects
  // -----------------------------------------------------

  // Effect 1: 處理認證（使用 onAuthStateChanged 和錯誤處理）
  useEffect(() => {
    let isSigningIn = false;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            setUserId(user.uid);
            setIsLoading(false);
            setFirebaseError(null);
        } else if (!isSigningIn) {
            isSigningIn = true;
            const attemptSignIn = async () => {
                try {
                    // 優先使用 Custom Token
                    if (typeof __initial_auth_token !== 'undefined') {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        // 否則，使用匿名登入
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Firebase Authentication failed:", error);
                    // 設置通用的 Firebase 錯誤信息
                    setFirebaseError("認證配置錯誤 (auth/configuration-not-found)。請檢查您的 Firebase 專案中是否啟用了 Authentication 服務。");
                    // 即使認證失敗，我們也需要一個 ID 來運行
                    const tempUserId = crypto.randomUUID();
                    setUserId(tempUserId);
                    setIsLoading(false);
                } finally {
                    isSigningIn = false;
                }
            };
            attemptSignIn();
        }
    });

    return () => unsubscribe();
  }, []);

  // Effect 2: 設置 Firestore 數據訂閱 (onSnapshot)
  useEffect(() => {
    // 只有在 userId 準備好並且沒有認證錯誤時才嘗試訂閱
    if (userId && !firebaseError) {
      const q = query(restaurantsCollection);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedRestaurants: Restaurant[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as RestaurantData;
          loadedRestaurants.push({
            ...data,
            id: doc.id,
          });
        });

        // 在本地按名稱排序
        loadedRestaurants.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

        setRestaurants(loadedRestaurants);
        if (isLoading) setIsLoading(false);
        setFirebaseError(null); // 如果成功，清除先前的權限錯誤
      }, (error) => {
        console.error("Error fetching restaurants from Firestore:", error);
        if (isLoading) setIsLoading(false);

        // 捕獲並設置 Firestore 權限錯誤
        if (error.code === 'permission-denied') {
             setFirebaseError("Firestore 權限不足 (Missing or insufficient permissions)。請檢查您的 **Firestore 安全規則**，確保允許對 `/artifacts/{appId}/public/data/restaurants` 進行讀寫。");
        } else {
             // 設置其他通用的 Firestore 錯誤
             setFirebaseError(`Firestore 數據加載失敗: ${error.message}`);
        }
      });

      return () => unsubscribe();
    }
  }, [userId, firebaseError, isLoading]);

  // -----------------------------------------------------
  // 3. 資料操作 (CRUD)
  // -----------------------------------------------------

  // Function to handle adding a new restaurant
  // 此函數允許用戶將新的餐廳添加到 Firebase Firestore
  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newRestaurantName.trim();
    if (name === '' || !userId || firebaseError) return;

    try {
        await addDoc(restaurantsCollection, {
            name: name,
            category: newRestaurantCategory,
            timestamp: serverTimestamp()
        });
        setNewRestaurantName('');
    } catch (error) {
        console.error("Error adding document: ", error);
        // 設置通用的 Firebase 錯誤信息
        if ((error as any).code === 'permission-denied') {
            setFirebaseError("Firestore 權限不足 (Missing or insufficient permissions)。請檢查您的 **Firestore 安全規則**。");
        } else {
            setFirebaseError("無法新增餐廳。請檢查您的連線和權限。");
        }
    }
  };

  // Function to handle removing a restaurant
  const handleRemoveRestaurant = async (id: string) => {
    if (!userId || firebaseError) return;

    try {
        const restaurantToRemove = restaurants.find(r => r.id === id);

        await deleteDoc(doc(db, RESTAURANTS_PATH, id));

        if (selectedRestaurant && restaurantToRemove?.name === selectedRestaurant) {
            setSelectedRestaurant(null);
        }
    } catch (error) {
        console.error("Error removing document: ", error);
        // 設置通用的 Firebase 錯誤信息
        if ((error as any).code === 'permission-denied') {
            setFirebaseError("Firestore 權限不足 (Missing or insufficient permissions)。請檢查您的 **Firestore 安全規則**。");
        } else {
            setFirebaseError("無法移除餐廳。請檢查您的連線和權限。");
        }
    }
  };


  // -----------------------------------------------------
  // 4. 滾動與篩選邏輯
  // -----------------------------------------------------

  // 使用 useMemo 根據活動類別過濾餐廳清單
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(restaurant => {
        const category = restaurant.category;

        if (category === '外食/外帶 (Dine-in/Takeout)') {
            // 混合類別邏輯
            const dineInActive = activeCategories.includes('外食 (Dine-in)');
            const takeOutActive = activeCategories.includes('外帶 (Takeout)');
            return dineInActive || takeOutActive;
        } else {
            // 標準類別邏輯
            return activeCategories.includes(category);
        }
    });
  }, [restaurants, activeCategories]);


  // 處理類別勾選框的變化
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


  // Function to handle the dice roll simulation
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
      const randomIndex = Math.floor(Math.random() * rollPool.length);
      setSelectedRestaurant(rollPool[randomIndex].name);
      rollCount++;

      // 快速滾動並在 10 次後停止
      if (rollCount > 10) {
        clearInterval(interval);
        setIsRolling(false);
        const finalIndex = Math.floor(Math.random() * rollPool.length);
        setSelectedRestaurant(rollPool[finalIndex].name);
      }
    }, 40);
  };

  // -----------------------------------------------------
  // 5. 渲染邏輯
  // -----------------------------------------------------
  const rollButtonClasses = isRolling
    ? "bg-red-400 hover:bg-red-500 cursor-not-allowed transform duration-150 shadow-inner"
    : "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-xl hover:shadow-2xl transition duration-300 ease-in-out hover:scale-105";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex justify-center items-center font-sans">
        <div className="text-2xl font-semibold text-indigo-600">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex justify-center items-center font-sans">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-6 md:p-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 text-center mb-2 tracking-tight">
          🍜 Dublin 5400 晚餐 命運轉盤 🎲
        </h1>
        <p className="text-center text-gray-500 mb-8">
          讓幸運骰子決定您今天要吃什麼！
        </p>

        {/* 顯示 UserId 和 Auth 錯誤 */}
        <p className={`text-xs text-right mb-4 ${firebaseError ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
            User ID: {userId || 'N/A'}
        </p>

        {/* Firebase 錯誤提示 (Custom Modal 代替 alert) */}
        {firebaseError && (
             <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md">
                <p className="font-bold">❌ Firebase 配置/權限錯誤</p>
                <p className="text-sm mt-1">{firebaseError}</p>
                {/* 針對權限錯誤提供明確的下一步建議 */}
                {firebaseError.includes('權限不足') && (
                    <p className="text-sm mt-2 font-medium">請到 Firebase Console，檢查 **Firestore Database Rules** 是否允許已認證用戶讀寫公共路徑。</p>
                )}
            </div>
        )}

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 rounded-lg border">
          {allCategories
            .filter(category => category !== '外食/外帶 (Dine-in/Takeout)')
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
            disabled={isRolling || !userId || !!firebaseError}
          />
          <select
            value={newRestaurantCategory}
            onChange={(e) => setNewRestaurantCategory(e.target.value as Category)}
            className="p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isRolling || !userId || !!firebaseError}
          >
            {allCategories.map(category => (
                <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button
            type="submit"
            className="shrink-0 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow transition duration-200 disabled:bg-gray-400"
            disabled={isRolling || newRestaurantName.trim() === '' || !userId || !!firebaseError}
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
                  disabled={isRolling || !userId || !!firebaseError}
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
