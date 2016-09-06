.PHONY: default naive clean

default:
	@gcc -Wall openGarden.c -o openGarden
	@./openGarden

naive:
	@gcc openGardenNaive.c -Wall -o openGardenNaive
	@./openGardenNaive

clean:
	@rm -f openGarden openGardenNaive