import { Palette } from '../classes';

export default class {
    /** 
     * @param {string} text JSON text data
     * @returns {Palette[]}
     */
    static parse(text) {
        const paletteObjects = JSON.parse(text);

        return paletteObjects.map(Palette.revive);
    }

    /** 
     * @param {Palette[]} palettes
     * @returns {string} JSON text data
     */
    static format(palettes) {
        return JSON.stringify(palettes.map(Palette.objectify), null, 2);
    }
}
