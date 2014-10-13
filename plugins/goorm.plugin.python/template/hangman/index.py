import random, string, time, os
frames = open('hangman.txt').read().split('nextscene\n')
rword = random.choice(open('words.txt').read().split('\n'))
key = rword.translate(string.maketrans(string.lowercase, '_' * len(string.lowercase)))
letters = []
def clear(s):
    print s
    time.sleep(1);
while True:
    print frames[0] % (str(letters).replace('\'', ''), key)
    if key == rword:
        print 'YOU WIN!'; break
    if len(frames) == 1:
        print 'YOU LOSE!'; break
    try:
        letter = raw_input()
    except:
        clear('That is not valid input!'); continue
    if letter not in [l for l in string.lowercase]:
        clear('That is not valid input!'); continue
    if letter in letters:
        clear('That letter was already tried!'); continue
    letters.append(letter)
    if letter in rword:
        key = [t for t in key]; c = 0; n = []
        for a in rword:
            if a == letter:
                n.append(c)
            c += 1
        for b in n:
            key[b] = rword[b]
        key = ''.join(key)
        clear('That letter is in the word!'); continue
    del frames[0]
    clear('That letter is not in the word!')