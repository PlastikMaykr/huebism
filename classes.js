import * as d3 from 'd3';

const generateId = () => Math.random().toFixed(14).slice(2);

/**
 * @typedef SwatchObj
 * @property {string} name
 * @property {string} color HEX color
 */

export class Swatch {
    /**
     * Turn Swatch prototype into plain object
     * @param {Swatch} swatch 
     * @returns {SwatchObj}
     */
    static objectify(swatch) {
        const {name, color} = swatch;
        return {
            name,
            color: color.formatHex()
        };
    }

    /**
     * @param {SwatchObj} swatchObj 
     * @param {Palette} palette 
     * @returns {Swatch}
     */
    static revive(swatchObj, palette) {
        const {name, color} = swatchObj;
        return new Swatch(name, color, palette);
    }

    constructor(name, color, palette) {
        /** @type {string} */
        this.name = name; 
        /** @type {string} */
        this.id = generateId();
        /** @type {d3.HSLColor} */
        this.color = d3.hsl(color).clamp(); 
        // this.color = color instanceof d3.hcl ? color : d3.hsl(color).clamp(); 
        /** @type {Palette} */
        this.palette = palette;
        // NOTE: do NOT automatically push new swatch to palette.swatches
    }

    getIndex() {
        if (!this.palette) return null;
        return this.palette.swatches.indexOf(this);
    }
}

/**
 * @typedef PaletteObj
 * @property {string} name
 * @property {SwatchObj[]} swatches
 */

export class Palette {
    /**
     * Turn Swatch prototype into plain object
     * @param {Palette} palette 
     * @returns {PaletteObj}
     */
    static objectify(palette) {
        return {
            name: palette.name,
            swatches: palette.swatches.map(Swatch.objectify)
        };
    }

    static serialize() {
        return JSON.stringify(this.collection.map(this.objectify))
    }

    static revive(paletteObj) {
        const { name, swatches } = paletteObj;
        const palette = new Palette(name, swatches.map(Swatch.revive));
        palette.swatches.forEach(swatch => swatch.palette = palette);
        return palette;
    }

    static deserialize(string) {
        const pseudoCollection = JSON.parse(string);
        pseudoCollection.forEach(this.revive);
        return this.collection;
    }

    /** @type {Palette[]} */
    static collection = [];
    
    /** @type {Palette|null} */
    static chosen = null;

    static get chosenIndex () {
        return this.collection.indexOf(this.chosen);
    }

    static delete(palette = this.chosen) {
        const index = this.collection.indexOf(palette);
        if (index < 0) debugger;
        this.collection.splice(index, 1);
    }

    constructor(name, swatches = []) {
        /** @type {string} */
        this.name = name; 
        /** @type {Swatch[]} */
        this.swatches = swatches;

        this.constructor.collection.push(this);
    }
}

/**
 * @typedef Dot
 * @type {d3.Selection<HTMLDivElement,Swatch,HTMLDivElement,undefined>}
 */

/* 
export class Dot {
    static {}
    constructor() {
        
    }
}
 */
