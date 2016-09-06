/**
 * David Cline
 * Open Garden application
 */

/*
  An implementation of a naive recursive algorithm
  solving the application puzzle.
*/

#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>
#include <time.h>

// Input goal value
#define GOAL 100000000

// Input values (can be a multiset, repetitions are allowed)
int SET[] = {18897109, 12828837, 9461105, 6371773, 5965343, 5946800, 
  5582170, 5564635, 5268860, 4552402, 4335391, 4296250, 4224851, 
  4192887, 3439809, 3279833, 3095313, 2812896, 2783243, 2710489, 
  2543482, 2356285, 2226009, 2149127, 2142508, 2134411};

/**
 * Prints a solution to stdout.
 * @param bool[] indices An array of booleans, true if the member at that
 *   index in the input is a part of this solution
 * @param int n Length of the input
 */
void emitSolution(bool indices[], int n)
{
  printf("A solution: {\n\t");
  for (int i = 0; i < n; i++) {
    if (indices[i] == 1) {
      printf("%d ", SET[i]);
    }
  }
  printf("\n}\n");
}

void findSubsetSums(long partialSum, int i, int n, bool usedIndices[]) 
{
  if (partialSum == GOAL) {
    printf("Found solution\n");
    emitSolution(usedIndices, n);
    return;
  }

  if (partialSum > GOAL) {
    return;
  }

  if (i > n) return;

  // Including the value at i
  bool copyOne[n];
  memcpy(copyOne, usedIndices, sizeof(usedIndices[0]) * n);
  copyOne[i] = true;
  findSubsetSums(partialSum + SET[i], i + 1, n, copyOne);

  // Excluding the value at i
  bool copyTwo[n];
  memcpy(copyTwo, usedIndices, sizeof(usedIndices[0]) * n);
  findSubsetSums(partialSum, i + 1, n, copyTwo);
  return;
}

int main() 
{
  clock_t start = clock(), diff;
  int n = sizeof(SET)/sizeof(SET[0]);
  
  bool startIndices[n];
  for(int j = 0; j < n; j++) {
    startIndices[j] = 0;
  }
  findSubsetSums(0, 0, n, startIndices);

  diff = clock() - start;
  int msec = diff * 1000 / CLOCKS_PER_SEC;
  printf("Took %d seconds, %d milliseconds\n", msec/1000, msec%1000);
  return 0;
}