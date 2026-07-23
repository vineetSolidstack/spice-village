/**
 * Bundled food photography.
 *
 * These are real dish photos (Indian and pan-Asian curries, rice, paneer,
 * tandoori) sourced from TheMealDB's free catalogue and bundled under
 * `assets/food/`. They stand in for the real photography kitchen owners will
 * eventually upload to Supabase Storage — a big step up from the gradient
 * placeholders, but still demo assets to be replaced in production.
 *
 * `require` paths must be static string literals for Metro to bundle them, so
 * the registry is written out explicitly rather than generated.
 */
import type { ImageSourcePropType } from 'react-native';

/** Every bundled dish photo, keyed for reuse by the menu editor's picker. */
export const FOOD_IMAGES: Record<string, ImageSourcePropType> = {
  baingan_bharta: require('../../assets/food/dish00.jpg'),
  beef_mandi: require('../../assets/food/dish01.jpg'),
  bread_omelette: require('../../assets/food/dish02.jpg'),
  chicken_handi: require('../../assets/food/dish03.jpg'),
  chicken_mandi: require('../../assets/food/dish04.jpg'),
  dal_fry: require('../../assets/food/dish05.jpg'),
  rajma: require('../../assets/food/dish06.jpg'),
  lamb_biryani: require('../../assets/food/dish07.jpg'),
  rogan_josh: require('../../assets/food/dish08.jpg'),
  matar_paneer: require('../../assets/food/dish09.jpg'),
  nutty_chicken: require('../../assets/food/dish10.jpg'),
  masala_fish: require('../../assets/food/dish11.jpg'),
  kedgeree: require('../../assets/food/dish12.jpg'),
  tandoori_chicken: require('../../assets/food/dish13.jpg'),
  lamb_tagine: require('../../assets/food/dish14.jpg'),
  massaman: require('../../assets/food/dish15.jpg'),
  panang: require('../../assets/food/dish16.jpg'),
  red_curry_kebab: require('../../assets/food/dish17.jpg'),
  curry_noodle_soup: require('../../assets/food/dish18.jpg'),
  fried_rice: require('../../assets/food/dish19.jpg'),
  green_curry: require('../../assets/food/dish20.jpg'),
  peanut_curry: require('../../assets/food/dish21.jpg'),
  prawn_curry: require('../../assets/food/dish22.jpg'),
  noodle_salad: require('../../assets/food/dish23.jpg'),
};

/** Stable ordering for the menu editor's photo picker. */
export const FOOD_IMAGE_KEYS = Object.keys(FOOD_IMAGES);
