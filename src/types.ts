/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppNotification {
  id: string;
  text: string;
  time: string;
  isRead?: boolean;
}

export type PetCategory = 'All' | 'Cat' | 'Dog' | 'Bird' | 'Other';

export interface PetProfile {
  id: string;
  name: string;
  imageUrl: string;
  category: PetCategory;
  breed: string;
  ageEstimation: string;
  energyLevel: string;
  carePlan: string;
  diyHacks: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  feedingRemindersEnabled?: boolean;
  feedingTimes?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  foodRecommendations?: string;
  nutritionTip?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
}

export interface AnalysisResult {
  category: PetCategory;
  breed: string;
  ageEstimation: string;
  energyLevel: string;
  carePlan: string;
  diyHacks: string;
  foodSafety: string;
  nutritionTip?: string;
  foodRecommendations?: string;
}
