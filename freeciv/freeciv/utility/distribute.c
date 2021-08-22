/***********************************************************************
 Freeciv - Copyright (C) 2004 - The Freeciv Project
   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2, or (at your option)
   any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
***********************************************************************/

#ifdef HAVE_CONFIG_H
#include <fc_config.h>
#endif

/* utility */
#include "log.h"                /* fc_assert */

#include "distribute.h"

/************************************************************************//**
  Distribute "number" # of elements into "groups" # of groups with ratios
  given by the elements in "ratios".  The resulting division is put into the 
  "result" array.

  For instance this code is used to distribute trade among science, tax, and
  luxury. In this case "number" is the amount of trade, "groups" is 3,
  and ratios[3] = {sci_rate, tax_rate, lux_rate}.

  The algorithm used to determine the distribution is a hybrid of 
  Banker's Rounding with the German raffle variant of Hamilton's Method.
  The Legacy Hamilton's method can be acccessed by calling distribute(),
  or distribute_real() with an even # seed.
****************************************************************************/
void distribute(int number, int groups, int *ratios, int *result) {
  // Legacy front-end function: Even # seed creates legacy output: 
  distribute_real(number, groups, ratios, result, 0);
}
void distribute_real(int number, int groups, int *ratios, int *result, int seed)
{
  int i, sum = 0, rest[groups], max_groups[groups], max_count, max;
#ifdef FREECIV_DEBUG
  const int original_number = number;
#endif
  /* Distributes a number of items into a number of groups with a given ratio.
   * This uses "Hamilton's Method". (The method is distorted and was vetoed by
   * George Washington, and later rejected in Germany.) On 21.August.2021 this
   * code was modified to use "Banker's Rounding" hybrids between the original 
   * method and the improved German method. This drastically reduces the heavy
   * skewing toward the first index on 50/50 cases. Formerly, many tiebreakers
   * HUGELY favoured index 1 over index 2, in turn hugely valued over index 3.
   * Now, index 1 is equally valued with index 2; while indices 1 and 2 remain
   * hugely valued over index 3, like before. This behaviour better represents
   * Freeciv's use-case for the algorithm: a distribution of taxes wherein the
   * first two indices represent positive tangible income [bulbs,gold] whereas
   * the third index, luxury, is intangible: not a tangible accumulated asset.
   *
   * 1) distribute the whole-numbered part of the targets
   * 2) sort the remaining fractions (called rest[])
   * 3) divide the remaining source among the targets starting with the
   *    biggest fraction. (If two targets have the same fraction:
   *    * the target with the smaller whole-number gets the remainder.
   *    if (still equal), then: {}
   *      * if (the seed was even): 
   *        { the target with the smaller index # is chosen. 1>2>3 }
   *      * else if (the seed was odd): 
   *        { if the value at index 2 is equal, it's chosen, otherwise the target
   *          with the smaller index # is chosen 2>1>3 }
   *    }
   *
   * To keep behaviour consistent, pcity->id is used as the seed, so that results
   * don't chaotically vary from turn to turn.
   *
   * For 'backward compatibility', the original behaviour of this algorithm will
   * be reproduced by always calling this function __with an even numbered seed.__
   * Moreover, the original declaration of the distribute() function does that
   * already.
   */
  for (i = 0; i < groups; i++) {
    fc_assert(ratios[i] >= 0);
    sum += ratios[i];
  }

  /* 1.  Distribute the whole-numbered part of the targets. */
  for (i = 0; i < groups; i++) {
    result[i] = number * ratios[i] / sum;
  }

  /* 2a.  Determine the remaining fractions. */
  for (i = 0; i < groups; i++) {
    rest[i] = number * ratios[i] - result[i] * sum;
  }

  /* 2b. Find how much source is left to be distributed. */
  for (i = 0; i < groups; i++) {
    number -= result[i];
  }

  while (number > 0) {
    max = max_count = 0;

    /* Find the largest remaining fraction(s). */
    for (i = 0; i < groups; i++) {
      if (rest[i] > max) {
        max_count = 1;
        max_groups[0] = i;
        max = rest[i];
      } else if (rest[i] == max) {
        max_groups[max_count] = i;
        max_count++;
        /* else if (the seed was odd): 
               { target 2 > target 1 > target 3+ } */
        if (i<2) { // only happens when rest[0]==rest[1].
          // prirority-swap them if the seed is odd:
          if (seed % 2 == 1) {
            max_groups[0] = 1;
            max_groups[1] = 0;
          }
        }
      }
    }

    if (max_count == 1) {
      /* Give an extra source to the target with largest remainder. */
      result[max_groups[0]]++;
      rest[max_groups[0]] = 0;
      number--;
    } else {
      int min = result[max_groups[0]], 
          which_min = max_groups[0];

      /* Give an extra source to the target with largest remainder and
       * smallest whole number. */
      fc_assert(max_count > 1);
      for (i = 1; i < max_count; i++) {
        if (result[max_groups[i]] < min) {
          min = result[max_groups[i]];
          which_min = max_groups[i];
        }
      }
      result[which_min]++;
      rest[which_min] = 0;
      number--;
    }
  }

#ifdef FREECIV_DEBUG
  number = original_number;
  for (i = 0; i < groups; i++) {
    fc_assert(result[i] >= 0);
    number -= result[i];
  }
  fc_assert(number == 0);
#endif /* FREECIV_DEBUG */
}
