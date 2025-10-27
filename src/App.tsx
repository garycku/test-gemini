import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
} from 'firebase/auth';
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
    setLogLevel,
    updateDoc,
} from 'firebase/firestore';
import { Category, allCategories, Restaurant, RestaurantData } from './types/type';
import { PencilIcon, Trash2Icon, CheckIcon, XIcon } from './types/icons';

setLogLevel('silent');

declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

const fallbackFirebaseConfig = {
    apiKey: 'AIzaSyCR8vTPzyfCveKLVnv4bYA_rGo_G7Du1mM',
    authDomain: 'test-gemini-2429e.firebaseapp.com',
    projectId: 'test-gemini-2429e',
    storageBucket: 'test-gemini-2429e.firebasestorage.app',
    messagingSenderId: '986136828585',
    appId: '1:986136828585:web:6397acf38061d82011a7b8',
    measurementId: 'G-GPWRXE3FM0',
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let firebaseConfig = fallbackFirebaseConfig;

if (typeof __firebase_config !== 'undefined' && __firebase_config.trim() !== '') {
    try {
        const envConfig = JSON.parse(__firebase_config);
        if (envConfig && envConfig.projectId) {
            firebaseConfig = envConfig;
        }
    } catch (e) {
        console.error('Error parsing __firebase_config, falling back to user-provided config.', e);
    }
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Set the storage path for public restaurant data
const RESTAURANTS_PATH = `/artifacts/${appId}/public/data/restaurants`;
const restaurantsCollection = collection(db, RESTAURANTS_PATH);

// Named export for the main component
export const App: React.FC = () => {
    // Data states
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
    const [isRolling, setIsRolling] = useState<boolean>(false);

    // Form states
    const [newRestaurantName, setNewRestaurantName] = useState<string>('');
    const [newRestaurantCategory, setNewRestaurantCategory] = useState<Category>(allCategories[0]);

    // Editing states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState<string>('');

    // Filter states
    const primaryCategories: Category[] = allCategories.filter(
        (c) => c !== '外食/外帶 (Dine-in/Takeout)',
    );
    const [activeCategories, setActiveCategories] = useState<Category[]>(primaryCategories);

    // Firebase states
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Use a single error state to manage all Firebase-related errors
    const [firebaseError, setFirebaseError] = useState<string | null>(null);

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
                        // Prioritize Custom Token sign-in
                        if (typeof __initial_auth_token !== 'undefined') {
                            await signInWithCustomToken(auth, __initial_auth_token);
                        } else {
                            // Otherwise, use Anonymous sign-in
                            await signInAnonymously(auth);
                        }
                    } catch (error) {
                        console.error('Firebase Authentication failed:', error);
                        // Set generic Firebase error message
                        setFirebaseError(
                            'Authentication configuration error (auth/configuration-not-found). Please check if Authentication is enabled in your Firebase project.',
                        );
                        // Even if authentication fails, we need an ID to run
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

    // Effect 2: Set up Firestore data subscription (onSnapshot)
    useEffect(() => {
        // Only attempt subscription when userId is ready and there's no auth error
        if (userId && !firebaseError) {
            const q = query(restaurantsCollection);

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const loadedRestaurants: Restaurant[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data() as RestaurantData;
                        loadedRestaurants.push({
                            ...data,
                            id: doc.id,
                        });
                    });

                    // Sort locally by name (Chinese collation used here)
                    loadedRestaurants.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));

                    setRestaurants(loadedRestaurants);
                    if (isLoading) setIsLoading(false);
                    setFirebaseError(null); // Clear previous permission errors on success
                },
                (error) => {
                    console.error('Error fetching restaurants from Firestore:', error);
                    if (isLoading) setIsLoading(false);

                    // Capture and set Firestore permission errors
                    if ((error as any).code === 'permission-denied') {
                        setFirebaseError(
                            'Firestore Permission Denied (Missing or insufficient permissions). Please check your **Firestore Security Rules** to ensure read/write access is allowed for `/artifacts/{appId}/public/data/restaurants`.',
                        );
                    } else {
                        // Set other generic Firestore errors
                        setFirebaseError(`Firestore data loading failed: ${error.message}`);
                    }
                },
            );

            return () => unsubscribe();
        }
    }, [userId, firebaseError, isLoading]);

    // -----------------------------------------------------
    // 4. Data Operations (CRUD)
    // -----------------------------------------------------

    // Function to handle adding a new restaurant
    const handleAddRestaurant = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newRestaurantName.trim();
        if (name === '' || !userId || firebaseError) return;

        try {
            await addDoc(restaurantsCollection, {
                name: name,
                category: newRestaurantCategory,
                timestamp: serverTimestamp(),
            });
            setNewRestaurantName('');
        } catch (error) {
            console.error('Error adding document: ', error);
            // Set generic Firebase error message
            if ((error as any).code === 'permission-denied') {
                setFirebaseError(
                    'Firestore Permission Denied (Missing or insufficient permissions). Please check your **Firestore Security Rules**.',
                );
            } else {
                setFirebaseError('Could not add restaurant. Please check your connection and permissions.');
            }
        }
    };

    // Function to handle removing a restaurant
    const handleRemoveRestaurant = async (id: string) => {
        if (!userId || firebaseError) return;

        try {
            const restaurantToRemove = restaurants.find((r) => r.id === id);

            await deleteDoc(doc(db, RESTAURANTS_PATH, id));

            if (selectedRestaurant && restaurantToRemove?.name === selectedRestaurant) {
                setSelectedRestaurant(null);
            }
        } catch (error) {
            console.error('Error removing document: ', error);
            // Set generic Firebase error message
            if ((error as any).code === 'permission-denied') {
                setFirebaseError(
                    'Firestore Permission Denied (Missing or insufficient permissions). Please check your **Firestore Security Rules**.',
                );
            } else {
                setFirebaseError('Could not remove restaurant. Please check your connection and permissions.');
            }
        }
    };

    // Function to start editing
    const handleEditStart = (restaurant: Restaurant) => {
        setEditingId(restaurant.id);
        setEditingName(restaurant.name);
    };

    // Function to save the edited name
    const handleEditSave = async () => {
        if (!editingId || !userId || firebaseError) return;

        const newName = editingName.trim();
        if (newName === '') {
            setEditingName('');
            setEditingId(null);
            return;
        }

        try {
            const docRef = doc(db, RESTAURANTS_PATH, editingId);
            await updateDoc(docRef, {
                name: newName,
            });
            setEditingId(null);
            setEditingName('');
        } catch (error) {
            console.error('Error updating document: ', error);
            if ((error as any).code === 'permission-denied') {
                setFirebaseError('Firestore Permission Denied. Could not update restaurant name.');
            } else {
                setFirebaseError('Could not update restaurant name. Please check your connection and permissions.');
            }
        }
    };

    // Function to cancel editing
    const handleEditCancel = () => {
        setEditingId(null);
        setEditingName('');
    };

    // -----------------------------------------------------
    // 5. Rolling and Filtering Logic
    // -----------------------------------------------------

    // Use useMemo to filter the restaurant list based on active categories
    const filteredRestaurants = useMemo(() => {
        return restaurants.filter((restaurant) => {
            const category = restaurant.category;

            if (category === '外食/外帶 (Dine-in/Takeout)') {
                // Mixed category logic
                const dineInActive = activeCategories.includes('外食 (Dine-in)');
                const takeOutActive = activeCategories.includes('外帶 (Takeout)');
                return dineInActive || takeOutActive;
            } else {
                // Standard category logic
                return activeCategories.includes(category);
            }
        });
    }, [restaurants, activeCategories]);

    // Handle category checkbox change
    const handleCategoryToggle = (category: Category) => {
        setActiveCategories((prevCategories) => {
            if (prevCategories.includes(category)) {
                return prevCategories.filter((c) => c !== category);
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
            setSelectedRestaurant('目前篩選下無餐廳可選！');
            return;
        }

        setIsRolling(true);
        setSelectedRestaurant('決定中...');

        let rollCount = 0;
        const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * rollPool.length);
            setSelectedRestaurant(rollPool[randomIndex].name);
            rollCount++;

            // Quick roll and stop after 10 times
            if (rollCount > 10) {
                clearInterval(interval);
                setIsRolling(false);
                const finalIndex = Math.floor(Math.random() * rollPool.length);
                setSelectedRestaurant(rollPool[finalIndex].name);
            }
        }, 40);
    };

    const rollButtonClasses = isRolling
        ? 'bg-red-400 hover:bg-red-500 cursor-not-allowed transform duration-150 shadow-inner'
        : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-xl hover:shadow-2xl transition duration-300 ease-in-out hover:scale-105';

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex justify-center items-center font-sans">
                <div className="text-2xl font-semibold text-indigo-600">載入中...</div>
            </div>
        );
    }

    // -----------------------------------------------------
    // 6. Component Rendering
    // -----------------------------------------------------

    const RestaurantItem: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => {
        const isEditing = editingId === restaurant.id;
        const isDisabled = isRolling || !userId || !!firebaseError;
        const isActive =
            activeCategories.includes(restaurant.category) ||
            (restaurant.category === '外食/外帶 (Dine-in/Takeout)' &&
                (activeCategories.includes('外食 (Dine-in)') ||
                    activeCategories.includes('外帶 (Takeout)')));

        return (
            <div
                key={restaurant.id}
                className={`flex items-center justify-between p-3 rounded-lg border border-gray-200 shadow-sm transition duration-150 ${
                    isActive ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-200 opacity-60'
                }`}
            >
                {isEditing ? (
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave();
                            if (e.key === 'Escape') handleEditCancel();
                        }}
                        className="flex-grow p-1 mr-4 border border-indigo-500 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                        autoFocus
                    />
                ) : (
                    <span className="text-gray-700 font-medium flex-grow">
                        <span className="font-light text-sm text-indigo-500 mr-2">
                            [{restaurant.category.split(' ')[0]}]
                        </span>
                        {restaurant.name}
                    </span>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-1 ml-4">
                    {isEditing ? (
                        <>
                            {/* Save Button */}
                            <button
                                onClick={handleEditSave}
                                className="text-green-500 hover:text-green-700 transition duration-150 p-1 rounded-full hover:bg-green-100 disabled:opacity-50"
                                disabled={isDisabled || editingName.trim() === ''}
                            >
                                <CheckIcon />
                            </button>
                            {/* Cancel Button */}
                            <button
                                onClick={handleEditCancel}
                                className="text-gray-500 hover:text-gray-700 transition duration-150 p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                                disabled={isDisabled}
                            >
                                <XIcon />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Edit Button */}
                            <button
                                onClick={() => handleEditStart(restaurant)}
                                className="text-indigo-500 hover:text-indigo-700 transition duration-150 p-1 rounded-full hover:bg-indigo-100 disabled:opacity-50"
                                disabled={isDisabled}
                            >
                                <PencilIcon />
                            </button>
                            {/* Delete Button */}
                            <button
                                onClick={() => handleRemoveRestaurant(restaurant.id)}
                                className="text-red-500 hover:text-red-700 transition duration-150 p-1 rounded-full hover:bg-red-100 disabled:opacity-50"
                                disabled={isDisabled}
                            >
                                <Trash2Icon />
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };


    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex justify-center items-center font-sans">
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-6 md:p-10">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 text-center mb-2 tracking-tight">
                    🍜 Dublin 5400 晚餐 命運轉盤 🎲
                </h1>
                <p className="text-center text-gray-500 mb-8">讓幸運骰子決定您今天要吃什麼！</p>

                {/* Display UserId and Auth Error */}
                <p
                    className={`text-xs text-right mb-4 ${firebaseError ? 'text-red-600 font-semibold' : 'text-gray-400'}`}
                >
                    User ID: {userId || 'N/A'}
                </p>

                {/* Firebase Error Message (Custom Modal instead of alert) */}
                {firebaseError && (
                    <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md">
                        <p className="font-bold">❌ Firebase Configuration/Permission Error</p>
                        <p className="text-sm mt-1">{firebaseError}</p>
                        {/* Provide clear next steps for permission errors */}
                        {firebaseError.includes('Permission Denied') && (
                            <p className="text-sm mt-2 font-medium">
                                Please go to the Firebase Console and check your **Firestore Database Rules** to ensure read/write access is allowed for authenticated users on the public path.
                            </p>
                        )}
                    </div>
                )}

                {/* Selection Display */}
                <div className="mb-8 p-6 bg-indigo-50 border-4 border-indigo-200 rounded-lg text-center">
                    <p className="text-lg text-gray-600 font-medium">今天吃：</p>
                    <div
                        className={`text-4xl sm:text-5xl font-black mt-2 text-indigo-800 transition-all duration-500 ease-in-out ${isRolling ? 'animate-pulse' : ''}`}
                    >
                        {selectedRestaurant || '按下骰子按鈕開始決定'}
                    </div>
                </div>

                {/* Roll Button */}
                <div className="flex justify-center mb-8">
                    <button
                        onClick={handleRoll}
                        disabled={isRolling || filteredRestaurants.length === 0}
                        className={`w-full max-w-sm text-white font-bold py-4 px-6 rounded-full focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg ${rollButtonClasses}`}
                    >
                        {isRolling
                            ? '擲骰決定中...'
                            : `開始擲骰！ (選項 ${filteredRestaurants.length} 間)`}
                    </button>
                </div>

                <hr className="mb-8 border-gray-200" />

                {/* --- Category Filters --- */}
                <h2 className="text-xl font-bold text-gray-700 mb-3">篩選類型</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 rounded-lg border">
                    {allCategories
                        .filter((category) => category !== '外食/外帶 (Dine-in/Takeout)')
                        .map((category) => (
                            <label
                                key={category}
                                className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition duration-150"
                            >
                                <input
                                    type="checkbox"
                                    checked={activeCategories.includes(category)}
                                    onChange={() => handleCategoryToggle(category)}
                                    disabled={isRolling}
                                    className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500 disabled:opacity-50"
                                />
                                <span className="text-gray-700 font-medium text-sm md:text-base">
                                    {category}
                                </span>
                            </label>
                        ))}
                </div>
                <hr className="mb-8 border-gray-200" />

                {/* Restaurant List Management */}
                <h2 className="text-2xl font-bold text-gray-700 mb-4 flex items-center">
                    餐廳清單管理 (總計 {restaurants.length} 間)
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 ml-2 text-indigo-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                </h2>

                {/* Add New Restaurant Form */}
                <form
                    onSubmit={handleAddRestaurant}
                    className="mb-6 flex flex-col md:flex-row gap-3"
                >
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
                        {allCategories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        className="shrink-0 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow transition duration-200 disabled:bg-gray-400"
                        disabled={
                            isRolling ||
                            newRestaurantName.trim() === '' ||
                            !userId ||
                            !!firebaseError
                        }
                    >
                        新增
                    </button>
                </form>

                {/* Restaurant List */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {restaurants.length > 0 ? (
                        restaurants.map((restaurant) => (
                           <RestaurantItem key={restaurant.id} restaurant={restaurant} />
                        ))
                    ) : (
                        <p className="text-center text-gray-500 italic p-4 border border-dashed rounded-lg">
                            清單是空的！請新增一些餐廳來開始擲骰。
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
