/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AppNotification {
  id: string;
  text: string;
  time: string;
  isRead?: boolean;
  type?: 'info' | 'reminder';
  createdAt?: any;
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
  foodSafety?: string;
  lastHealthCheck?: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
}

export interface HealthLog {
  id: string;
  petId: string;
  ownerId?: string;
  petName?: string;
  symptoms: string;
  imageUrl?: string;
  diagnosis: string;
  description: string;
  careInstructions: string;
  vetUrgency: 'low' | 'medium' | 'high';
  createdAt: any;
}

export interface HealthAnalysisResult {
  diagnosis: string;
  description: string;
  careInstructions: string;
  vetUrgency: 'low' | 'medium' | 'high';
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
