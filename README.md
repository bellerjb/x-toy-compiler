# X-TOY Compiler

Work in progress compiler for translating code written in a custom language to instructions for Princeton's Visual X-TOY. Based on [The Super Tiny Compiler][1].

## Language Reference

(X-TOY Compiler does *not* support comments. This code will not run.)

```javascript
let x          // Initialize a variable named x.
let x = 10     // Initialize a variable named x and set it to 10.
x = 15         // Sets x to 15.
&1 = x         // Sets register 1 to the value of x.
let y = io     // Initialize a variable named y and set it to user input.
io = add(x, y) // Print the value of x + y.
Label:         // Declare a jump label named "Label".

add(x, y)      // Returns x + y.
sub(x, y)      // Returns x - y.
and(x, y)      // Returns the bitwise and of x and y.
xor(x, y)      // Returns the bitwise xor of x and y.
shiftr(x, y)   // Returns x shifted y to the right.
shiftl(x, y)   // Returns x shifted y to the left.
jz(x, Label)   // Jumps to Label if x equals 0.
jp(x, Label)   // Jumps to Label if x is positive.
exit()         // Halts the program.
```

## Progress

- [x] Variables
- [x] Assignment
- [x] Constants
- [x] Register Manipulation
- [ ] Proper Register Management
- [ ] Labels
- [x] Addition
- [ ] Subtraction
- [ ] Bitwise And
- [ ] Bitwise Or
- [ ] Shift Right
- [ ] Shift Left
- [ ] Jump Zero
- [ ] Jump Positive
- [ ] Exit

[1]: https://github.com/thejameskyle/the-super-tiny-compiler