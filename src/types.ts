/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
}

export interface AnalysisResult {
  breed: string;
  ageEstimation: string;
  energyLevel: string;
  carePlan: string;
  diyHacks: string;
  foodSafety: string;
}
