import { Palette } from '../classes';

const capitalize = (str, separator = '-') => str
    .split(separator)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

export default class {
    static emptyPaletteObj(name = '') {
        return {
            name,
            swatches: []
        }
    }

    /** 
     * @param {string} text CSS text data
     * @returns {Palette[]}
     */
    static parse(text) {
        const paletteObjs = [];
        const lines = text
            .split(/[\r\n|\r|\n]/)
            .join('')
            .split(/(?<=;).*?(?=--)/);

        let currentPaletteObj = this.emptyPaletteObj('My CSS palette');

        for (const line of lines) {

            const name = capitalize(line.match(/(?<=--)[a-zA-Z0-9_-]+(?=:)/)[0]);
            const colors = line.match(/#([A-Fa-f0-9]{6})/g);

            if (colors.length > 1) { // '--gradient: linear-gradient(0deg, #f7f4ea, #ded9e2);'
                if (currentPaletteObj.swatches.length) {
                    paletteObjs.push(currentPaletteObj);
                    currentPaletteObj = this.emptyPaletteObj(name);
                } else {
                    currentPaletteObj.name = name;
                }

                currentPaletteObj.swatches = colors.map((color, index) => ({
                    name: name + (index + 1),
                    color
                }));

                paletteObjs.push(currentPaletteObj);

                currentPaletteObj = this.emptyPaletteObj('My CSS palette');

            } else { // --single-color: #60afbf;
                currentPaletteObj.swatches.push({
                    name,
                    color: colors[0]
                });
            }

        }

        if (currentPaletteObj.swatches.length) {
            paletteObjs.push(currentPaletteObj);
        }

        return paletteObjs.map(Palette.revive);
    }

    /** 
     * @param {Palette[]} palettes
     * @returns {string} CSS text data
     */
    static format(palettes) {
        let colors = '';
        let gradients = '/* Gradients */\n';

        for (const palette of palettes.map(Palette.objectify)) {
            const { name: paletteName, swatches } = palette;
            let gradientColors = '';

            colors += `/* ${paletteName} */\n`;

            for (const { name, color } of swatches) {
                gradientColors += ',' + color;

                let swatchName = name
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]+/g, '_');
                const prefix = swatchName.startsWith('--') ? '' : '--';

                colors += `${prefix + swatchName}: ${color};\n`;
            }
            colors += '\n';
            gradientColors = gradientColors.slice(1);

            const prefix = paletteName.startsWith('--') ? '' : '--';
            gradients += `${prefix + paletteName.toLowerCase()}: linear-gradient(${gradientColors});\n`;
        }


        return colors + gradients;
    }
}
