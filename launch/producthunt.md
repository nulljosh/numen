Name (<=40 chars):
Numen

Tagline (<=60 chars):
A calculator with no rows. Write anywhere.

Description (<=260 chars):
Type an expression on an infinite canvas and drag it. Click a result to link it into what you're writing. Change a number upstream and everything downstream recalculates. Any expression can plot itself over x. Free, no account, nothing leaves your device.

Topics (3):
Math, Productivity, Open Source

First comment (maker story):
Tydlig was an iOS app with a free-form layout. It was discontinued. I didn't want that layout to go with it, so Numen is a rebuild.

A row calculator puts every sum in one list. That's fine for one sum and awkward for several related ones. Here every expression sits on a canvas, and you drag it wherever it helps you think.

The part I like most is linking. Click a result and it drops into what you're typing. Change a number upstream and everything downstream recalculates, the way a spreadsheet cell ripples through its formulas. The dependency walk is built so a loop can't hang it.

Any expression can also plot itself over x. The graph is plain SVG, drawn inline.

The parser is a small recursive-descent one, written from scratch. There's no math library, no drag library and no chart library. It runs in the browser, and nothing leaves your device.

It's free and open source, under MIT. Questions about the parser or the canvas are welcome in the comments.

Pricing line:
Free.

Links:
Web: https://numen.jaybulb.com
GitHub: https://github.com/nulljosh/labs/tree/main/numen
