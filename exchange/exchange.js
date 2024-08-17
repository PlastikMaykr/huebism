import * as d3 from 'd3';
import { default as ExchangeJSON } from './json';

export class FormatExchange {
    static types = {
        json: ExchangeJSON,
    };

    // static chosenFormat = this.formats.json;
    static chosen = 'json';

    static parse(text, extension = this.chosen) {
        return this.types[extension].parse(text);
    }

    static format(palettes, format = this.chosen) {
        return this.types[format].format(palettes);
    }
}

export class FileExchange {
    /** @example '.jpg, .jpeg, .png' */
    static acceptedExtensions = Object.keys(FormatExchange.types)
        .map(ext => '.' + ext)
        .join();

    /**
     * @param {Function} callback 
     */
    static load(callback) {
        d3.create('input')
            .attr('type', 'file')
            .attr('accept', this.acceptedExtensions)
            .on('change', (event) => {
                const file = event.target.files[0];

                const reader = new FileReader();
                reader.onload = () => {
                    callback(file.name, reader.result);
                };
                reader.readAsText(file);
            })
            .node()
            .click();
    }

    /**
     * Trigger browser's 'Save as...' dialog
     * @param {string} filename proposed file name with extension
     * @param {string} text text to be encoded into the file
     */
    static save(filename, text) {
        d3.create('a')
            .attr('download', filename)
            .attr('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
            .node()
            .click();
    }
}
