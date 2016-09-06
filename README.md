#Open Garden Application

This repository contains both a solution to the application puzzle and sample code from a recent NodeJS project.

##Puzzle solution  
My initial thought was to use dynamic programming, as the subset-sum problem reduces to the knapsack problem. But, because the dynamic programming solution I had in mind takes time relative to the size of the input values and their sums, it doesn't make sense to use here -- since we need exact accuracy, we can't represent the numbers in a fashion smaller than they are given.  

So I implemented a naive recursive algorithm instead. It considers all possible subset-sums by walking down the list, either including or excluding the current value in the sum which is passed to the next recursive call. This algorithm is better than my dynamic programming solution, on this kind of input, because it runs in time relative to the size of the list rather than the size of representations the input values. (O(n2^n, where n is the length of the list).

The naive algorithm is pretty slow (about 2.5s - 3s seconds on my machine), so I implemented another faster version. If you sort the values in advance, you can use some heuristics that give a big speed improvement (O(2^n), ~80 milliseconds on my machine). These heuristics take advantage of the fact that the sorted values are monotonically increasing in order to exit out of recursive branches earlier. The particular heuristics in use have comments in the code, explaining how they hope to save time and why they are valid.

Note: both versions search for all valid solutions, instead of exiting on the first solution. 

I included a Makefile which compiles and runs either of the programs. I'm working in `C11` using the `gcc` compiler on Mac OS X. 

To run the faster version
```
make
```

To run the naive version
```
make naive
```

To clean up, run
```
make clean
```

### References
Horowitz, Ellis; Sahni, Sartaj (1974), "Computing partitions  
    with applications to the knapsack problem", Journal of the Association for  
    Computing Machinery, 21: 277–292 doi:10.1145/321812.321823, MR 035400


##Code sample
Some code from a recent NodeJS project is in the `codeSample` directory. The code included is part of a system for handling file uploads and file management, maintaining metadata regarding those files, and passing data to a renderer for the file management front end. It's part of a system to animate images and video in elevators in sync with the elevator's movement in its shaft. I designed modules for uploading images and video (included), scheduling different combinations of those images and video, and publishing over the mall's network to the elevators in real-time. 

`content-manager/index.js` is an implementation of a REST API for the file uploads. `lib/util.js` handles a lot of the file system interaction. A suite of end-to-end tests for testing file management system is in the `content-manager/tests` directory. 