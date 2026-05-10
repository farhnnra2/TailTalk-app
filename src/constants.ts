/**
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PetHack {
  id: string;
  title: string;
  description: string;
  tag: string;
}

export const PET_HACKS: PetHack[] = [
  {
    id: '1',
    tag: 'Grooming',
    title: 'Coconut Oil Shine',
    description: 'Add a tiny teaspoon of organic coconut oil to your pet\'s food. It helps maintain a shiny coat and supports healthy skin naturally!'
  },
  {
    id: '2',
    tag: 'Hydration',
    title: 'Frozen Treat Cubes',
    description: 'Freeze low-sodium chicken broth in ice cube trays. These "pupsicles" keep dogs hydrated and cool during hot afternoons.'
  },
  {
    id: '3',
    tag: 'Behavior',
    title: 'The Slow Feeding Trick',
    description: 'If your pet eats too fast, place an upside-down smaller bowl inside their main dish. This creates a "donut" shape that forces them to slow down.'
  },
  {
    id: '4',
    tag: 'Cleaning',
    title: 'The Squeegee Hack',
    description: 'Struggling with fur on the carpet? Use a window squeegee! The rubber tip pulls up deeply embedded pet hair that vacuums often miss.'
  },
  {
    id: '5',
    tag: 'Safety',
    title: 'DIY Night Visibility',
    description: 'Add a small reflective strip or a clip-on LED light to your pet\'s harness for evening walks. It makes them much easier for cars to see.'
  },
  {
    id: '6',
    tag: 'Health',
    title: 'Snuffle Mat Magic',
    description: 'Hide dry treats inside a folded towel or "snuffle mat." This engages their sense of smell and provides intense mental stimulation.'
  }
];
