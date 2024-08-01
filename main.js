/* Imports */
import './style.css';
import './components/corner-fold-toggle.css';
import * as d3 from 'd3';
import { Swatch, Palette } from './classes';
import { HueWheel } from './components/hue-range-widget'


/* 
 * MARK: Constants
 */
const STRING = {
    defaultPrePalette: 'web colors',
    prePalette: 'pre-palette',
    defaultPaletteName: 'CustomPalette',
    customPalettes: 'custom-palettes',
};

const dimension = 550;
const diameter = 15;
const radius = diameter / 2;

d3.select(document.documentElement)
    .style('--dimension', dimension)
    .style('--diameter', diameter);

let perspective = dimension * 5;

const remapScale = d3.scaleLinear()
    // .domain([0, 360])
    .range([radius, dimension - radius]);

const hueScale = remapScale.copy()
    .domain([0, 360]);

function hueRangeCallback() {
    hueScale.domain(this.spread());

    dots.call(remapHueAxis);
}

const hueWidget = new HueWheel('#hue-wheel', hueRangeCallback);

/**
 * @typedef ColorStore
 * @property {Swatch} swatch parent swatch
 * @property {HTMLDivElement} dot div.dot in 3D plot
 * @property {HTMLDivElement} preview div.swatch in custom palette panel
*/

/** @type {ColorStore} */
const colorStoreTemplate = {
    swatch: null,
    dot: null,
    preview: null
};

/** @type {WeakMap<d3.HSLColor,ColorStore>} */
const colorMap = new WeakMap();
colorMap.store = function (color) {
    if (!color instanceof d3.color) throw new Error('Color is not valid.', color);

    if (!this.has(color)) {
        this.set(color, { ...colorStoreTemplate });
    }

    return this.get(color);
};

const chosen = {
    mark: false,
    /** @type {d3.HSLColor|null} */
    _color: null,
    get color() {
        return this._color;
    },
    set color(newColor) {
        if (this._color === newColor) return;

        // unhighlight old preview
        let preview = this.preview;
        if (preview) d3.select(preview)
            .classed('highlight', false);

        if (this.mark) {
            d3.select(this.dot).classed('highlight', false);
            this._color = newColor;
            d3.select(this.dot).classed('highlight', true);
        } else {
            this._color = newColor;
        }

        // info panel swatch
        relabel(newColor);

        // highlight new preview
        preview = this.preview;
        if (preview) d3.select(preview)
            .classed('highlight', true);
    },
    get swatch() {
        if (!this._color) return null;
        return colorMap.get(this._color)?.swatch;
    },
    get dot() {
        if (!this._color) return null;
        return colorMap.get(this._color)?.dot;
    },
    get preview() {
        if (!this._color) return null;
        return colorMap.get(this._color)?.preview;
    },
};


/* 
 * MARK: Utilities
 */
// const chosenSwatchDiv = d3.select('#chosen-swatch');
const colorStrip = d3.select('#color-strip');
function relabel(color) {
    // chosenSwatchDiv.style('background-color', color.formatHex())
    colorStrip.style('color', color.formatHex())
}

function dotUpdate(dot) {
    if (!(dot instanceof d3.selection)) dot = d3.select(dot);

    dot
        .style('--fill', d => d.color)
        .call(remapHueAxis)
        .style('--y', ({ color }) => dimension - remapScale(color.s) - radius + 'px')
        .style('--z', ({ color }) => dimension / 2 - remapScale(color.l) + 'px');
}

function dotHighlight(dot) {
    if (!(dot instanceof d3.selection)) dot = d3.select(dot);

    dot
        .style('outline', '3px solid rgba(255, 255, 255, 0)')
        .style('outline-offset', '500px')
        .transition().duration(500).ease(d3.easeCubicOut)
        .style('outline-color', 'rgba(255, 255, 255, 0.5)')
        .style('outline-offset', '5px')
        .on('end', () => {
            dot
                .style('outline', null)
                .style('outline-offset', null)
        });
}

function plantDots() {
    const swatches = Palette.chosen ? [...prePalette, ...Palette.chosen.swatches] : prePalette;

    dots = cube.selectAll('.dot')
        .data(swatches, d => d.id)
        .join(
            enter => enter
                .append('div')
                .classed('dot', true)
                .classed('custom', d => !!d.palette)
                .style('--fill', d => d.color)
                .style('--y', ({ color }) => dimension - remapScale(color.s) - radius + 'px')
                .style('--z', ({ color }) => dimension / 2 - remapScale(color.l) + 'px')
                .call(remapHueAxis)
                .each((d, i, g) => {
                    const colorStore = colorMap.store(d.color);
                    colorStore.swatch = d;
                    colorStore.dot = g[i];
                }),
            update => update
                .style('--fill', d => d.color)
                .style('--y', ({ color }) => dimension - remapScale(color.s) - radius + 'px')
                .style('--z', ({ color }) => dimension / 2 - remapScale(color.l) + 'px')
                .call(remapHueAxis),
            exit => exit
                .each((d, i, g) => {
                    colorMap.get(d.color).dot = null;
                })
                .remove()
            /* 
            .style('border', '3px solid red')
            .transition(500)
            .on('end', (d,i,g) => {
                d3.select(g[i])
                .remove()
            })
             */
        )

    if (chosen.mark) {
        d3.select(chosen.dot).classed('highlight', true);
    }
}

const format = d3.format(".2f");

/** 
 * Update title attr with value, which shows up as tooltip
 * @param {d3.Selection} slider
 * @example slider.call(titleUpdate)
 */
function titleUpdate(slider) {
    slider.on('change.title', function () {
        slider.attr('title', this.value);
    });
}

function autoFocus(slider) {
    slider.on('mouseenter.focus', function () {
        this.focus(); // { preventScroll: false }
    }).on('mouseleave.focus', function () {
        this.blur(); // { preventScroll: false }
    });
}

/** 
 * Step slider value with wheel event
 * @param {d3.Selection<HTMLInputElement>} input
 */
function inputAutoWheel(input, negate = true) {
    const min = +input.attr('min') || 0;
    const max = +input.attr('max') || Infinity;
    const step = +input.attr('step') || 1;

    input.on('wheel', function (event) {
        event.preventDefault();

        const delta = Math.round(event.deltaY / 100) || Math.sign(event.deltaY);
        const sign = negate ? -1 : 1;
        const value = sign * delta * step + +this.value;

        console.dir([min, value, max])
        if (min > value || value > max) return;

        this.value = value;
        input.dispatch('input').dispatch('change');
    });
}

/** 
 * Traverse select options with wheel event
 * @param {d3.Selection<HTMLSelectElement>} dropdown
 */
function dropdownAutoWheel(dropdown, skipLast = false) {
    dropdown.on('wheel', function (event) {
        event.preventDefault();

        const step = Math.sign(event.deltaY);
        const total = this.options.length - (skipLast ? 1 : 0);
        const newIndex = (this.selectedIndex + step + total) % total;

        this.selectedIndex = newIndex;
        dropdown.dispatch('change');
    });
}


/*
 * MARK: 3D plot
 */
const plot = d3.select('.plot')
    .style('--perspective', perspective);

const plotElement = plot.node();

const hitbox = plot.append('div')
    .classed('hitbox', true);

const cube = plot.append('div')
    .classed('cube', true)
    .style('width', dimension + 'px')
    .style('height', dimension + 'px');

['front', 'top', 'right', 'left', 'bottom', 'back'].forEach(side => {
    cube.append('div').classed(`side ${side}`, true)
});

/** @type {import('./classes').Dot} */
let dots = cube.selectAll();


/* Tilt effect */
// d3.select('.front').style('pointer-events', 'auto')

hitbox
    .on('mousemove', (event) => {
        // event.stopPropagation();

        const [absX, absY] = d3.pointer(event);
        const x = absX / dimension;
        const y = absY / dimension;
        const invertX = 1 - x;
        const invertY = 1 - y;

        plot
            .style('--x', invertX * 100 + '%')
            .style('--y', invertY * 100 + '%');
    })
    .on('wheel', (event) => {
        if (perspective + event.deltaY < dimension * 2) return;
        event.preventDefault();
        perspective += event.deltaY;
        plot.style('--perspective', perspective);
    });


/* Cube rotation */
const cubeRotation = {
    x: 0,
    y: 0,
    z: 0
};

let dragStart = null;

const dragRot = (event) => {
    const [absX, absY] = d3.pointer(event, plotElement).map((v, i) => v - dragStart[i]);

    return {
        x: -90 * absY / dimension,
        y: 90 * absX / dimension
    }
};

const cubeDrag = d3.drag()
    .on('start', (event) => {
        dragStart = d3.pointer(event, plotElement);
    })
    .on('drag', (event) => {
        let { x, y } = dragRot(event);

        // weaken rotations that do not lead to initial state
        if (cubeRotation.x !== 0) {
            y /= 4;
            if (Math.sign(cubeRotation.x) === Math.sign(x)) x /= 4;
            x += 90 * cubeRotation.x;
        }
        if (cubeRotation.y !== 0) {
            x /= 4;
            if (Math.sign(cubeRotation.y) === Math.sign(y)) y /= 4;
            y += 90 * cubeRotation.y;
        }

        cube
            .style(`--X`, `${x}deg`)
            .style(`--Y`, `${y}deg`)
            .style('--rot-x', -x + 'deg')
            .style('--rot-y', -y + 'deg');
    })
    .on('end', (event) => {
        const rot = dragRot(event);
        if (!rot.x && !rot.y) return;

        const bigger = Math.abs(rot.x) > Math.abs(rot.y) ? 'x' : 'y';
        const rotSign = Math.sign(rot[bigger]);

        let bounce = true;

        if (Math.abs(rot[bigger]) > 45) {
            if (Object.values(cubeRotation).every(v => v === 0) ||
                cubeRotation[bigger] + rotSign === 0) {
                cubeRotation[bigger] += rotSign;
                bounce = false;
            }
        }

        const { x, y, z } = cubeRotation;

        cube
            .transition()
            .duration(bounce ? 200 : 350)
            .ease(d3.easeBackOut.overshoot(bounce ? 2 : 0.5))
            .style(`--X`, `${90 * x}deg`)
            .style(`--Y`, `${90 * y}deg`)
            .style('--rot-x', `${-90 * x}deg`)
            .style('--rot-y', `${-90 * y}deg`);
    });

hitbox.call(cubeDrag);


/* 
 * MARK: Predefined palettes
 */
/** @param {d3.Selection} dots */
function remapHueAxis(dots) {
    const [min, max] = hueWidget?.range.spread() ?? [0, 360];

    if (0 <= min && max <= 360) { // [ ■■■ ]
        dots.each((d, i, g) => {
            const dot = d3.select(g[i]);
            const dotHue = d.color.h;
            if (min <= dotHue && dotHue <= max) {
                dot
                    .style('--x', hueScale(dotHue) - radius + 'px')
                    .style('display', null)
            } else {
                dot.style('display', 'none')
            }
        });
    } else if (min < 0) { // ■[■■ ]
        dots.each((d, i, g) => {
            const dot = d3.select(g[i]);
            const dotHue = d.color.h;
            if (dotHue <= max) {
                dot
                    .style('--x', hueScale(dotHue) - radius + 'px')
                    .style('display', null)
            } else if (min <= dotHue - 360) {
                dot
                    .style('--x', hueScale(dotHue - 360) - radius + 'px')
                    .style('display', null)
            } else {
                dot.style('display', 'none')
            }
        });
    } else if (360 < max) { // [ ■■]■
        dots.each((d, i, g) => {
            const dot = d3.select(g[i]);
            const dotHue = d.color.h;
            if (min <= dotHue) {
                dot
                    .style('--x', hueScale(dotHue) - radius + 'px')
                    .style('display', null)
            } else if (dotHue + 360 <= max) {
                dot
                    .style('--x', hueScale(dotHue + 360) - radius + 'px')
                    .style('display', null)
            } else {
                dot.style('display', 'none')
            }
        });
    } else {
        debugger;
    }
}

const predefined = {
    none: {
        name: 'none',
        palette: []
    },
    test: {
        name: 'test',
        palette: null
    },
    coolors: {
        name: 'coolors',
        palette: null
    },
    Crayola: {
        name: 'crayola',
        palette: null
    },
    'web colors': { // STRING.defaultPrePalette
        name: 'web_colors',
        palette: null
    },
    Wikipedia: {
        name: 'wikipedia',
        palette: null
    },
    xkcd: {
        name: 'xkcd',
        palette: null
    },
    Dulux: {
        name: 'dulux',
        palette: null
    },
    'Google material': {
        name: 'google_material',
        palette: null
    },
    'Open color': {
        name: 'open-color',
        palette: null
    },
    'Tailwind': {
        name: 'tailwind',
        palette: null
    },
    'Canva': {
        name: 'canva',
        palette: null
    },
    'Figma': {
        name: 'figma',
        palette: null
    },
}

/** @type {Swatch[]} */
let prePalette = [];

async function importColorJson(option) {
    if (!(option in predefined)) option = STRING.defaultPrePalette;
    if (predefined[option].palette) return prePalette = predefined[option].palette;

    const fileName = predefined[option].name;
    const colorsJson = await import(`./data/${fileName}.json`);
    // if (!Array.isArray(colorsJson.default)) debugger;

    prePalette = colorsJson.default
        .map(({ name, hex }) => new Swatch(name, hex));

    predefined[option].palette = prePalette;

    return prePalette;
}

/** @type {d3.Selection<HTMLSelectElement,Object,d3.BaseType,undefined>} */
const paletteSelect = d3.select('#pre-palette');
const paletteCounter = d3.select('#pre-palette-counter');

paletteSelect
    .selectAll('option')
    .data(Object.keys(predefined))
    .join('option')
    .text(d => d);

paletteSelect
    .on('change', async function (event) {
        const option = this.value
        window.localStorage.setItem(STRING.prePalette, option);

        await importColorJson(option);
        console.log(prePalette);
        paletteCounter.text(prePalette.length);

        plantDots();
    })
    .call(() => {
        const dropdown = paletteSelect.node();
        const option = window.localStorage.getItem(STRING.prePalette) ?? STRING.defaultPrePalette;
        console.info(`Loading ${option} from predefined palettes...`);
        const index = [...dropdown.options].findIndex(opt => opt.value === option);
        dropdown.selectedIndex = index;
    })
    .dispatch('change');


/* 
 * MARK: Custom palettes
 */
/** @type {d3.Selection<HTMLSelectElement,Palette[],d3.BaseType,undefined>} */
const customSelect = d3.select('#custom-palette')
    .call(dropdownAutoWheel, true)
    .on('change', function (event) {
        // last option: 'New palette...'
        if (this.selectedIndex === this.options.length - 1) {
            createNewPalette();
            return;
        }

        const index = this.selectedIndex;
        choosePalette(index);
    });

d3.select('#palette-rename').on('click', () => renamePalette());
d3.select('#palette-delete').on('click', deletePalette);

function choosePalette(index = 0) {
    Palette.chosen = Palette.collection[index];
    customSelect.node().selectedIndex = index;
    plantDots();
    PalettePreview.display();
}

function createNewPalette(name) {
    if (name === undefined) {
        // NOTE: prompt() returns null if cancelled
        name = prompt('New palette name:', STRING.defaultPaletteName)
    }

    const newPalette = new Palette(name);

    customSelect.insert('option', 'hr')
        .datum(newPalette)
        .text(d => d.name);

    choosePalette(Palette.collection.length - 1);
}

function renamePalette(name) {
    if (name === undefined) {
        name = prompt('New name:')
    }

    Palette.chosen.name = name;

    const index = Palette.chosenIndex;
    const option = [...customSelect.node().options][index];
    option.textContent = name;
}

function deletePalette() {
    const index = Palette.chosenIndex;
    if (!confirm(`Delete ${Palette.chosen.name} and all of its swatches?`)) return;
    console.log(JSON.stringify(Palette.objectify(Palette.chosen)));

    Palette.delete(/* Palette.chosen */);

    const option = [...customSelect.node().options][index];
    d3.select(option).remove();

    if (Palette.collection.length) {
        choosePalette(0);
    } else {
        createNewPalette(STRING.defaultPaletteName);
    }
};

/* 
 * MARK: Custom colors
 */
class PalettePreview {
    /** @type {d3.Selection<HTMLDivElement,Swatch[],d3.BaseType,undefined>} */
    static selection = d3.select('#palette-preview')
        .on('click', function (event) {
            const target = event.target;
            if (!target.classList.contains('swatch')) return;

            const swatch = target.__data__;
            infoGauges.display(swatch);
            chosen.color = swatch.color;
        });

    static plus = d3.create('div')
        .attr('id', 'add-color')
        .text('+')
        .on('click', function (event) {
            event.stopPropagation();
            console.log('aDD');
            /** @type {Swatch} */
            const swatch = this.parentElement.parentElement.__data__;
            const index = swatch.getIndex();
            addCustomColor(index);
        });

    static lerp = d3.create('div')
        .attr('id', 'lerp-color')
        .text('≁')
        .on('click', function (event) {
            event.stopPropagation();
            console.log('LErp');
            /** @type {Swatch} */
            const swatch = this.parentElement.parentElement.__data__;
            const index = swatch.getIndex();
            LerpColors.open(index);
        });

    static minus = d3.create('div')
        .attr('id', 'remove-color')
        .text('-')
        .on('click', function (event) {
            event.stopPropagation();
            console.log('suB');
            if (!confirm('Delete swatch?')) return;

            const swatch = this.parentElement.__data__;
            // console.log(swatch);
            removeSwatch(swatch);
        });

    static handle = d3.create('div')
        .attr('id', 'drag-color')
        .text('↔')
        .call(this.drag);

    static drag(handle) {
        const grandParent = PalettePreview.selection.node();
        /** @type {Swatch} */
        let swatch;
        /** @type {d3.Selection} */
        let parent;
        /** @type {number} */
        let index, start, width, halfWidth, maxWidth;

        function dragstart(event) {
            const parentElement = this.parentElement;
            swatch = parentElement.__data__;
            parent = d3.select(parentElement).style('z-index', 2);
            index = [...grandParent.children].indexOf(parentElement);
            ([start] = d3.pointer(event, grandParent));
            ({ width } = parentElement.getBoundingClientRect());
            halfWidth = width / 2;
            maxWidth = grandParent.scrollWidth;
            // console.log({ parent, index, width, x: start, maxWidth });
        }

        function dragging(event) {
            const [current] = d3.pointer(event, grandParent);
            let x = current - start;
            if ((index === 0 && x < 0) ||
                (maxWidth < index * width + width + x)) {
                parent.style('translate', `${0}px`);
                return;
            }

            if (x < -halfWidth) {
                // view
                const self = parent.node();
                const prev = self.previousElementSibling;
                self.after(prev);

                d3.select(prev)
                    .style('translate', `${-width}px`)
                    .transition()
                    .style('translate', `${0}px`)
                    .on('end', (d, i, g) => {
                        d3.select(g[i]).style('translate', null);
                    });

                // data
                const swatches = swatch.palette.swatches;
                [swatches[index - 1], swatches[index]] = [swatches[index], swatches[index - 1]];
                start -= width;
                index--;

                x += width;

            } else if (halfWidth < x) {
                // view
                const self = parent.node();
                const next = self.nextElementSibling;
                self.before(next);

                d3.select(next)
                    .style('translate', `${width}px`)
                    .transition()
                    .style('translate', `${0}px`)
                    .on('end', (d, i, g) => {
                        d3.select(g[i]).style('translate', null);
                    });

                // data
                const swatches = swatch.palette.swatches;
                [swatches[index], swatches[index + 1]] = [swatches[index + 1], swatches[index]];
                start += width;
                index++;

                x -= width;
            }

            parent.style('translate', `${x}px`);
        }

        function dragend(event) {
            parent
                .transition()
                .style('translate', `${0}px`)
                .on('end', (d, i, g) => {
                    parent
                        .style('translate', null)
                        .style('z-index', null);
                });

            PalettePreview.paintGradient();
        }

        return d3.drag()
            .on('start', dragstart)
            .on('drag', dragging)
            .on('end', dragend)
            (handle);
    }

    static display() {
        this.selection.selectAll('.swatch')
            .data(Palette.chosen.swatches, d => d.id)
            .join(
                enter => enter
                    .append('div')
                    .classed('swatch', true)
                    .style('--fill', d => d.color)
                    .attr('title', d => d.name)
                    .each((d, i, g) => {
                        const element = g[i];
                        colorMap.get(d.color).preview = element;

                        d3.select(element)
                            .append('div')
                            .classed('before', true)
                            .on('mouseenter', (event) => {
                                if (LerpColors.on) return;

                                const border = event.target;
                                const preview = border.parentElement;
                                if (event.relatedTarget === preview) {
                                    d3.select(preview)
                                        .dispatch('mouseleave')
                                }

                                border.append(this.plus.node());
                                if (!preview.matches(':first-of-type'))
                                    border.append(this.lerp.node());
                            })
                            .on('mouseleave', (event) => {
                                if (event.relatedTarget === event.target.parentElement) {
                                    d3.select(event.target.parentElement)
                                        .dispatch('mouseenter')
                                }

                                this.plus.node().remove();
                                this.lerp.node().remove();
                            });
                    })
                    .on('mouseenter', (event, swatch) => {
                        if (event.explicitOriginalTarget !== event.target) return;

                        dotHighlight(colorMap.get(swatch.color).dot);

                        if (LerpColors.on) return;

                        event.target.append(this.minus.node());
                        event.target.append(this.handle.node());
                    })
                    .on('mouseleave', (event, swatch) => {
                        this.minus.node().remove();
                        this.handle.node().remove();
                    }),
                update => update,
                exit => exit
                    .each((d, i, g) => {
                        colorMap.get(d.color).preview = null;
                    })
                    .remove()
            );

        this.paintGradient();
    }

    static gradient = d3.select('#palette-gradient')
        .on('click', () => this.paintGradient());

    static paintGradient() {
        const colors = Palette.chosen.swatches
            .map(swatch => swatch.color.formatHex());

        this.gradient
            .style('--gradient', colors);
    }
}

/*
 * MARK: Color interpolation
 */
class LerpColors {
    /** @type {d3.Selection<HTMLDivElement,Swatch[],d3.BaseType,undefined>} */
    static selection = d3.select('#lerp-panel');

    static hide(hidden = true) {
        this.selection.style('display', hidden ? 'none' : null);

        d3.select('#custom-palette-group').classed('disabled', !hidden);
    }

    static on = false;

    static settings = {
        count: 1,
        ease: {
            h: 'easeLinear',
            s: 'easeLinear',
            l: 'easeLinear',
        },
        easeConfig: {
            h: 3,
            s: 3,
            l: 3,
        }
    };

    static res = {
        lerpPallete: new Palette('_lerp_'),
        /** @type {Palette} */
        currentPallete: null,
        index: null,
        swatchesBefore: null,
        swatchesAfter: null,
        startSwatch: null,
        endSwatch: null,
        newSwatches: null,
    };

    static easeings = {
        // {func: config}
        'easeLinear': null,
        'easeSinIn': null,
        'easeSinOut': null,
        'easeSinInOut': null,
        'easePolyIn': 'exponent',
        'easePolyOut': 'exponent',
        'easePolyInOut': 'exponent',
        'easeBackIn': 'overshoot',
        'easeBackOut': 'overshoot',
        'easeBackInOut': 'overshoot',
    };

    static {
        Palette.delete(this.res.lerpPallete);
        const settings = this.settings;
        const reload = this.reload;

        d3.select('#lerp-accept')
            .on('click', () => this.accept());

        d3.select('#lerp-cancel')
            .on('click', () => this.cancel());

        d3.select('#lerp-count')
            .each((d, i, g) => g[i].value = 1)
            .call(inputAutoWheel)
            .on('change', function () {
                settings.count = +this.value;
                reload();
            });

        const easeings = this.easeings;

        const dropdowns = {
            h: d3.select('#hue-ease'),
            s: d3.select('#sat-ease'),
            l: d3.select('#lit-ease'),
        };

        for (const [prop, dropdown] of Object.entries(dropdowns)) {
            dropdown
                .selectAll('option')
                .data(Object.keys(easeings))
                .join('option')
                .text(d => d.split('ease')[1])
                .attr('value', d => d);

            dropdown
                .each((d, i, g) => g[i].selectedIndex = 0)
                .call(dropdownAutoWheel)
                .on('change', function () {
                    settings.ease[prop] = this.value;

                    d3.select(this.nextElementSibling)
                        .style('display', easeings[this.value] ? null : 'none');

                    reload();
                })
                .dispatch('change');
        }

        const sliders = {
            h: d3.select('#hue-ease-slider'),
            s: d3.select('#sat-ease-slider'),
            l: d3.select('#lit-ease-slider'),
        };

        for (const [prop, slider] of Object.entries(sliders)) {
            slider
                .each((d, i, g) => g[i].value = 3)
                .attr('title', 3)
                .style('display', 'none')
                .call(titleUpdate)
                .call(inputAutoWheel)
                .on('change', function () {
                    settings.easeConfig[prop] = +this.value;
                    reload();
                });
        }
    }

    /**
     * 
     * @param {typeof d3.interpolateNumber} lerp interpolator
     * @param {number} count 
     * @param {(t:number) => number} easing easing function
     */
    static quantease(lerp, count, easing) {
        const samples = [];
        for (let i = 1; i <= count; i++) {
            samples[i - 1] = lerp(easing(i / (count + 1)));
        }
        return samples;
    }

    static reload() {
        const LERP = LerpColors;
        if (!LERP.on) return;
        const res = LERP.res;
        const settings = LERP.settings;
        const count = settings.count;

        const samples = {};
        hslLetters.forEach(prop => {
            const lerpStr = prop == 'h' ? 'interpolateHue' : 'interpolateNumber';
            const lerp = d3[lerpStr](res.startSwatch.color[prop], res.endSwatch.color[prop]);

            const easeStr = settings.ease[prop];
            let ease;
            if (LERP.easeings[easeStr]) {
                ease = d3[easeStr][LERP.easeings[easeStr]](settings.easeConfig[prop]);
            } else {
                ease = d3[easeStr];
            }

            samples[prop] = LERP.quantease(lerp, count, ease);
        });

        const newSwatches = res.newSwatches = [];
        const { h, s, l } = samples;
        for (let i = 0; i < count; i++) {
            const color = `hsl(${h[i]},${s[i] * 100}%,${l[i] * 100}%)`;
            // console.log(color);
            const name = res.startSwatch.name + '-' + i;
            const swatch = new Swatch(name, color);
            newSwatches.push(swatch);
        }

        const swatches = res.lerpPallete.swatches;
        swatches.length = 0;
        swatches.push(...res.swatchesBefore);
        swatches.push(...newSwatches);
        swatches.push(...res.swatchesAfter);

        plantDots();
        PalettePreview.display();
    }

    /** @param {number} index pallete index to splice new swatches in */
    static open(index = 1) {
        this.on = true;
        this.hide(false);

        const res = this.res;
        res.index = index;
        res.currentPallete = Palette.chosen;

        const chosenSwatches = Palette.chosen.swatches;
        res.swatchesBefore = chosenSwatches.slice(0, index);
        res.swatchesAfter = chosenSwatches.slice(index);
        res.startSwatch = chosenSwatches[index - 1];
        res.endSwatch = chosenSwatches[index];

        Palette.chosen = res.lerpPallete;
        this.reload();
    }

    static reset() {
        this.on = false;
        this.hide(true);

        const res = this.res;
        Palette.chosen = res.currentPallete;

        res.currentPallete = null;
        res.index = null;
        res.swatchesBefore = null;
        res.swatchesAfter = null;
        res.startSwatch = null;
        res.endSwatch = null;
        res.newSwatches = null;

        plantDots();
        PalettePreview.display();
    }

    static accept() {
        const { currentPallete, index, newSwatches } = this.res;
        newSwatches.forEach(swatch => swatch.palette = currentPallete);
        currentPallete.swatches.splice(index, 0, ...newSwatches);

        this.reset();
    }

    static cancel() {
        this.reset();
    }
}

/**
 * 
 * @param {number} paletteIndex 
 * @param {Swatch} swatch 
 */
function addCustomColor(paletteIndex, swatch) {
    // swatch
    if (!swatch) {
        const suffix = '-ish';// '-like'

        if (chosen.color) {
            const name = chosen.swatch.name + suffix;
            const color = chosen.color.copy();
            swatch = new Swatch(name, color, Palette.chosen);
        } else {
            swatch = new Swatch('Black' + suffix, 'black', Palette.chosen);
        }

        chosen.color = swatch.color;
    }

    // palette
    if (paletteIndex) {
        Palette.chosen.swatches.splice(paletteIndex, 0, swatch);
    } else {
        Palette.chosen.swatches.push(swatch);
    }
    console.debug(Palette.chosen);

    // view
    plantDots();

    PalettePreview.display();
    d3.select(chosen.preview).classed('highlight', true);

    infoGauges.display(swatch);
}

/** @param {Swatch} swatch */
function removeSwatch(swatch) {
    // swatch
    const palette = swatch.palette;
    const index = swatch.getIndex();
    if (index < 0) throw new Error('Swatch is not part of its palette', swatch);

    // palette
    palette.swatches.splice(index, 1);

    // view
    plantDots();
    PalettePreview.display();
}

(() => {
    const storedPalettes = window.localStorage.getItem(STRING.customPalettes);
    console.info('Stored palettes:');
    console.info(storedPalettes);
    if (!storedPalettes) {
        console.info('no palettes in storage');
        createNewPalette(STRING.defaultPaletteName);
        return;
    }

    const parsedPalettes = Palette.deserialize(storedPalettes);
    // console.log(parsedPalettes);

    // create
    for (let palette of parsedPalettes) {
        customSelect.insert('option', 'hr')
            .datum(palette)
            .text(d => d.name);
    }

    choosePalette(0);
})();

d3.select('#palette-panel')
    .on('mouseleave', () => {
        if (Palette.chosenIndex < 0) return;

        console.info('Saving palettes...');
        const serialPalettes = Palette.serialize();
        // console.log(serialPalettes);
        window.localStorage.setItem(STRING.customPalettes, serialPalettes)
    });


/* 
 * MARK: Color pick
 */
plot
    .on('click', (event) => {
        const target = event.target
        // TODO: check if target has datum() or .dot class
        if (!dots.nodes().includes(target)) return;
        const swatch = target.__data__;
        if (chosen.color === swatch.color) return;

        chosen.color = swatch.color;
        infoGauges.display(swatch);
    })
    .on('dblclick', (event) => {
        if (LerpColors.on) return;
        if (!event.target.classList.contains('dot')) return;

        addCustomColor();
    });

const hslLetters = ['h', 's', 'l'];
const rgbLetters = ['r', 'g', 'b'];

const infoGauges = {
    nameTag: d3.select('#color-name')
        .each((d, i, g) => g[i].value = '')
        .on('input', function () {
            const value = this.value;
            const swatch = chosen.swatch;
            swatch.name = value;

            const { preview } = colorMap.get(swatch.color);
            d3.select(preview).attr('title', d => d.name);
        })
        .node(),
    hexTag: d3.select('#color-hex')
        .each((d, i, g) => g[i].value = '')
        .on('change', function (event) {
            let color = d3.color(this.value);
            let rgb, hsl;
            if (color instanceof d3.hsl) {
                hsl = color.clamp();
                rgb = color.rgb();
            } else if (color instanceof d3.rgb) {
                hsl = d3.hsl(color).clamp();
                rgb = color;
            } else {
                this.value = this.defaultValue;
                return;
            }

            this.defaultValue = this.value;

            // color update
            color = chosen.color;
            const { dot, preview } = colorMap.get(color);
            color.h = hsl.h;
            color.s = hsl.s;
            color.l = hsl.l;

            // dot update
            dotUpdate(dot);
            dotHighlight(dot);

            // palette swatch/preview
            d3.select(preview).style('--fill', d => d.color);

            // gauges update
            for (const letter of hslLetters) {
                const value = format(hsl[letter]);
                if (isNaN(value)) debugger;
                const gauges = infoGauges.map.get(letter);
                Object.values(gauges).forEach(gauge => gauge.value = value)
            }

            for (const letter of rgbLetters) {
                const value = format(rgb[letter]);
                const gauges = infoGauges.map.get(letter);
                Object.values(gauges).forEach(gauge => gauge.value = value)
            }
        })
        .node(),
    setName: function (value) { this.nameTag.value = value },
    setHex: function (value) {
        this.hexTag.value = value;
        this.hexTag.defaultValue = value;
    },
    editable: false,
    makeEditable: function (toggle) {
        if (toggle === this.editable) return;
        this.editable = toggle;

        d3.select(this.nameTag).attr('readonly', toggle ? null : '');
        d3.select(this.hexTag).attr('readonly', toggle ? null : '');

        for (const [prop, gauge] of this.map) {
            d3.select(gauge.input).style('display', toggle ? null : 'none');
            d3.select(gauge.progress).style('display', toggle ? 'none' : null);
        }
    },
    display: function (swatch) {
        this.setName(swatch.name);

        const hex = swatch.color.formatHex().toUpperCase();
        this.setHex(hex);

        const { h, s, l } = swatch.color;
        const { r, g, b } = swatch.color.rgb();
        const combo = { h, s, l, r, g, b };

        for (const [prop, value] of Object.entries(combo)) {
            const gauges = this.map.get(prop);
            Object.values(gauges).forEach(gauge => gauge.value = format(value))
        }

        this.makeEditable(!!swatch.palette);
    },
    gaugeChange: function (prop) {
        // TODO: consolidate common parts of HSL and RGB gauge changes 
        if (rgbLetters.includes(prop)) {
            return function () {
                const color = chosen.color;
                const dot = chosen.dot;
                const value = +this.value;

                const rgb = color.rgb();
                rgb[prop] = value;
                const hsl = d3.hsl(rgb);

                // color update
                color.h = hsl.h;
                color.s = hsl.s;
                color.l = hsl.l;

                // color update
                color[prop] = value;

                // other gauges
                infoGauges.map.get(prop).output.value = format(value);

                // other sliders update
                for (const letter of hslLetters) {
                    const value = format(hsl[letter]);
                    const gauges = infoGauges.map.get(letter);
                    Object.values(gauges).forEach(gauge => gauge.value = value)
                }

                // hex tag
                const hex = color.formatHex().toUpperCase();
                infoGauges.setHex(hex);

                // dot update
                dotUpdate(dot);

                // palette swatch/preview
                const { preview } = colorMap.get(color);
                d3.select(preview).style('--fill', d => d.color);

                // info panel swatch
                relabel(color);

                // lerp update
                // if (LerpColors.on) {
                // TODO: check if the change was relevant to the colors being interpolated
                LerpColors.reload();
                // }
            }
        } else {
            return function () {
                const color = chosen.color;
                const { dot, preview } = colorMap.get(color);
                const value = +this.value;

                // color update
                color[prop] = value;

                // other gauges
                infoGauges.map.get(prop).output.value = format(value);

                // other sliders update
                const rgb = color.rgb();
                for (const letter of rgbLetters) {
                    const value = format(rgb[letter]);
                    const gauges = infoGauges.map.get(letter);
                    Object.values(gauges).forEach(gauge => gauge.value = value)
                }

                // hex tag
                const hex = color.formatHex().toUpperCase();
                infoGauges.setHex(hex);

                // dot update
                dotUpdate(dot);

                // palette swatch/preview
                d3.select(preview).style('--fill', d => d.color);

                // info panel swatch
                relabel(color);

                // lerp update
                LerpColors.reload();
            }
        }
    },
};

infoGauges.map = new Map(['h', 's', 'l', 'r', 'g', 'b']
    .map(prop => {
        const gauge = d3.select(`#${prop}-gauge`);

        return [
            prop,
            {
                input: gauge.selectChild('[type="range"]')
                    .on('change', infoGauges.gaugeChange(prop))
                    // .call(autoFocus)
                    .call(inputAutoWheel)
                    .node(),
                progress: gauge.selectChild('progress')
                    .on('change', infoGauges.gaugeChange(prop))
                    .node(),
                output: gauge.selectChild('[type="text"]')
                    .each((d, i, g) => g[i].value = '')
                    .on('change', infoGauges.gaugeChange(prop))
                    .node()
            }
        ]
    })
);


/* 
 * MARK: UI Controls
 */
// viz check
d3.select('#viz-check')
    .each((d, i, g) => { g[i].checked = false })
    .on('change', function () {
        if (chosen.mark = this.checked) {
            d3.select(chosen.dot).classed('highlight', true);
        } else {
            dots.classed('highlight', false);
        }
    });

d3.select('#viz-label')
    .on('mouseenter', () => {
        const dot = chosen.dot;
        if (dot) {
            d3.select(dot).classed('highlight', true);
            dotHighlight(dot);
        }
    })
    .on('mouseleave', () => {
        if (chosen.mark) return;

        const dot = chosen.dot;
        if (dot) {
            d3.select(dot).classed('highlight', false);
        }
    });

// BG/FG sliders
const body = d3.select(document.body);

function setBodyValue(plane, value) {
    body.style(`--${plane}-value`, value + '%');
    // body.style('--bg-value', value + '%');
}

const bgSlider = d3.select('#bg-slider')
    .call(inputAutoWheel)
    .on('input', function (event) {
        setBodyValue('bg', this.value);
    })
    .dispatch('input');

const fgSlider = d3.select('#fg-slider')
    .call(inputAutoWheel)
    .on('input', function (event) {
        setBodyValue('fg', this.value);
    })
    .dispatch('input');


/*
 * MARK: Globals
 */
globalThis.d3 = d3;
globalThis.chosen = chosen;
globalThis.Swatch = Swatch;
globalThis.Palette = Palette;
globalThis.Preview = PalettePreview;
globalThis.Lerp = LerpColors;
globalThis.Hue = hueWidget;
