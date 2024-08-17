### Todo

- [ ] import predefined palette
- [ ] store UI widgets' state
- [ ] panels' headers with popup instructions
- [ ] drag chosen dot across looked at dimensions
- [ ] move dot in screen Z dimention while dragging 
- [ ] keep chosen color clone to enable undoing changes

- [ ] 'dimension' resizable & dependant on viewport size
- [ ] 'diameter' resizable & adjustable with a slider
- [ ] toggle for disableing perspective
- [ ] toggle for inverting and disableing tilt effect
- [ ] tilt effect driven by cube face closest to view
- [ ] cube drag rotation by cube face closest to view
- [ ] pass dot events through cube face closest to view
- [ ] cube rotation indicator widget
- [ ] dots enter and exit animations

- [ ] center dots CSS transformation origin (like SVG <circle>)
- [ ] Dot class
- [ ] allow d3.color to be passed and used in Swatch constructor
- [ ] invalidate serialized palettes and save when appropriate
- [ ] LerpColors.reload() - recycle swatches if count is the same
- [ ] refactor palette UI actions into a class
- [ ] refactor info panel actions into a class
- [ ] rotate dots with CSS by negating cubes rotation
- [ ] plain elements delibrate styling
- [ ] fonts in rems, sizes in px


### In Progress

- [x] custom palettes overview modal
- [x] custom palettes editing
- [o] custom palettes import/export
- [ ] create custom palettes from various data


### Done ✓

- [x] implement hitbox for dragging & perspective hover
- [x] read clicked dot with plot events delegation
- [x] empty pre-palette for clean custom palette preview
- [x] memoize already loaded pre-palettes
- [x] save pre-palette name in localStorage
- [x] recall pre-pallete from localStorage
- [x] string keys object
- [x] chosen color & associated elements map
- [x] Swatch & Palette classes
- [x] interpolate colors
- [x] color interpolation easeing functions
- [x] easeing functions config (exponent, overshoot, etc.)
- [x] read clicked dot with parent event delegation
- [x] double click a dot to add to palette
- [x] dot mark toggle
- [x] color input field (for HEX codes, etc.)
- [x] background lightness slider
- [x] font and cube edges lightness slider
- [x] sliders & dropdowns: wheel event changes value
- [x] create a git brunch and folder for working on UI components
- [x] info panel corner fold widget for marking chosen dot
- [x] hue range widget
- [x] additional predefined palettes
- [x] general styling improvements
