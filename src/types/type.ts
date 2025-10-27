import { DocumentData } from 'firebase/firestore';

// Define the custom string literals used for categories
export type Category =
    | '外食 (Dine-in)'
    | '外帶 (Takeout)'
    | '速食 (Fast Food)'
    | '外食/外帶 (Dine-in/Takeout)';

// Define the array of all valid categories (exported for use in the component)
export const allCategories: Category[] = [
    '外食 (Dine-in)',
    '外帶 (Takeout)',
    '速食 (Fast Food)',
    '外食/外帶 (Dine-in/Takeout)',
];

/**
 * Defines the data structure as stored in a Firestore document.
 */
export interface RestaurantData extends DocumentData {
    name: string;
    category: Category;
    timestamp?: any; // Firestore Timestamp is dynamic, so 'any' or specific Timestamp type is often used
    userId?: string;
}

/**
 * Defines the complete structure used in the React component (RestaurantData + document ID).
 */
export interface Restaurant extends RestaurantData {
    id: string; // The unique Firestore document ID
}
