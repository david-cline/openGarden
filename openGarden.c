/**
 * David Cline
 * Open Garden application
 */

/**
 * A recursive solution of the application puzzle,
 *   using heuristics enabled by sorting the input to make
 *   speed improvements.
 
 * Reference:
 * Horowitz, Ellis; Sahni, Sartaj (1974), 
 *   "Computing partitions with applications to the knapsack problem", 
 *   Journal of the Association for Computing Machinery, 21: 277–292
 *   doi:10.1145/321812.321823, MR 035400
 */

#include <stdio.h>      /* printf */
#include <stdlib.h>     /* qsort */
#include <stdbool.h>    /* bool */
#include <string.h>     /* memcpy */
#include <time.h>       /* clock */

// Input goal value
#define GOAL 100000000

// Input values (can be a multiset, repetitions are allowed)
int SET[] = {18897109, 12828837, 9461105, 6371773, 5965343, 5946800, 
  5582170, 5564635, 5268860, 4552402, 4335391, 4296250, 4224851, 
  4192887, 3439809, 3279833, 3095313, 2812896, 2783243, 2710489, 
  2543482, 2356285, 2226009, 2149127, 2142508, 2134411};

// Comparison function for quicksort
int compareInts(const void *a, const void *b) 
{
  const int *ia = (const int *) a;
  const int *ib = (const int *) b;

  return *ia - *ib;
}


/**
 * Prints a solution to the console.
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

/**
 * Given that SET is a sorted array, prints all subsets of the integers of SET
 *   that add to GOAL.
 * @param long partialSum The sum of the values considered in the current subset
 * @param int i Index of the next value from the input set to consider
 * @param int n Total number of elements in the input set
 * @param long remSum The sum of the elements that have not yet been considered
 * @param int[] usedIndices Indices of the values from the input set that add to partialSum
 */
void findSubsetSums(long partialSum, int i, int n, long remSum, bool usedIndices[]) 
{
  // HEURISTICS (assuming input is sorted)

  // If the sum of the elements in the current subset and the rest of the elements
  //   in the input is less than GOAL, no need to consider this subset further, as
  //   no combination of the following elements is sufficient to reach the goal
  if (partialSum + remSum < GOAL) return;

  // If the current partial sum added to the remaining elements sum to the GOAL
  //   we know that this is a solution and that there are no more solutions to
  //   consider for this subset, as using fewer than all the remaining elements
  //   cannot bring us to our goal
  if (partialSum + remSum == GOAL) {
    bool copyThree[n];
    memcpy(copyThree, usedIndices, sizeof(usedIndices[0]) * n);
    for (int j = i; j < n; j++) {
      copyThree[j] = true;
    }
    emitSolution(copyThree, n);
    return;
  }

  // If the next value brings us beyond the goal, we know 
  //   that no combination of the current set's values
  //   and the remaining values will work, as all the remaining
  //   values are equal to or larger than the current value
  if (partialSum + SET[i] > GOAL) return;

  bool foundSolFlag = false;
  bool copyOne[n];
  memcpy(copyOne, usedIndices, sizeof(usedIndices[0]) * n);
  if (partialSum + SET[i] == GOAL) {
    foundSolFlag = true;
    copyOne[i] = true;
    emitSolution(copyOne, n);
  }
  if (i + 1 >= n) return;
  if(!foundSolFlag) {
    copyOne[i] = true;
    findSubsetSums(partialSum + SET[i], i + 1, n, remSum - SET[i], copyOne);
  }
  bool copyTwo[n];
  memcpy(copyTwo, usedIndices, sizeof(usedIndices[0]) * n);
  findSubsetSums(partialSum, i + 1, n, remSum - SET[i], copyTwo);
  return;
}

/* Sorts the input and calls findSubsetSum */
int main()
{
  clock_t start = clock(), diff;

  int n = sizeof(SET)/sizeof(SET[0]);
  qsort(SET, n, sizeof(SET[0]), compareInts);
  long totalSum = 0;
  for (int i = 0; i < n; i++) {
    totalSum += SET[i];
  }
  bool startIndices[n];
  for(int j = 0; j < n; j++) {
    startIndices[j] = 0;
  }
  findSubsetSums(0, 0, n, totalSum, startIndices);

  diff = clock() - start;
  int msec = diff * 1000 / CLOCKS_PER_SEC;
  printf("Took %d seconds, %d milliseconds\n", msec/1000, msec%1000);
  return 0;
}