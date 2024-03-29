/********************************************************************** 
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

#ifndef FC__DISTRIBUTE_H
#define FC__DISTRIBUTE_H

#ifdef __cplusplus
extern "C" {
#endif /* __cplusplus */

void distribute(int number, int groups, int *ratios, int *result);
void distribute_real(int number, int groups, int *ratios, int *result, int seed);

#ifdef __cplusplus
}
#endif /* __cplusplus */

#endif /* FC__DISTRIBUTE_H */
