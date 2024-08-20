import * as d3 from 'd3';
import './modal.css';
import { Palette } from '../classes';
import { FormatExchange, FileExchange } from '../exchange/exchange';

export class ExportModal {
    static defaultCode =
        'Select at least one of your palettes below.\n' +
        'You can also change the format using buttons above.';

    /** @type {HTMLDialogElement} */
    dialog;
    /** @type {d3.Selection} */
    closeButton;
    /** @type {d3.Selection} */
    openButton;
    /** @type {d3.Selection} */
    modal;
    /** @type {d3.Selection} */
    overall;
    /** @type {d3.Selection} */
    downloadButton
    /** @type {d3.Selection} */
    codefield
    /** @type {d3.Selection} */
    overview;
    /** @type {Set<Palette>} */
    paletteSet;
    /** @type {Function} */
    callback;

    constructor(dialog, openButton, callback) {
        this.dialog = dialog instanceof HTMLDialogElement ?
            dialog : document.querySelector(dialog);

        dialog = d3.select(this.dialog)
            .on('close', () => this.close())
            .on('mouseup', (event) => {
                if (event.target !== this.dialog) return;
                this.dialog.close();
            });

        dialog.select('#import')
            .on('click', (event, d) => {
                FileExchange.load((name, extension, stringed) => {
                    const parsed = FormatExchange.parse(stringed, extension);
                    console.log({ name, extension, stringed, parsed });

                    this.rebuild();
                    this.update();
                });
            });

        this.closeButton = dialog
            .select('.close')
            .on('click', () => this.dialog.close());

        this.openButton = openButton instanceof d3.selection ?
            openButton : d3.select(openButton);
        this.openButton.on('click', () => this.open());

        this.modal = dialog.select('.modal');

        this.modal.select('.knobs')
            .call(knobs => knobs.text('Formats:'))
            .selectAll('button')
            .data(Object.keys(FormatExchange.types))
            .join('button')
            .text(d => d.toUpperCase())
            .on('click', (event, d) => {
                FormatExchange.chosen = d;
                this.update();
            });

        this.overall = this.modal.select('.overall');
        this.downloadButton = this.overall
            .append('button')
            .text('Download')
            .on('click', () => this.download());
        this.codefield = this.overall
            .append('pre')
            .text(ExportModal.defaultCode);

        this.overview = this.modal.select('.overview');

        // this.swatchMap = new Map();
        this.paletteSet = new Set();

        this.callback = callback || (() => { });
    }

    open() {
        // TODO: accept selected palettes as parameter 
        console.log('EXPORT DIALOG');

        this.rebuild();
        this.update();

        this.dialog.showModal();

        this.closeButton.node().focus();
    }

    close() {
        console.log('Done Exporting');

        this.overview.selectAll('div').remove();

        this.callback();
    }

    rebuild() {
        console.log('REBUILD', this);

        this.overview.selectAll('.exp-wrapper')
            .data(Palette.collection, d => d.id)
            .join(enter => enter.append('div')
                .classed('exp-wrapper', true)
                .call(wrapper => {
                    const label = wrapper
                        .text(d => d.name)
                        .on('click', (event, palette) => {
                            const action = this.paletteSet.has(palette) ? 'delete' : 'add';
                            this.paletteSet[action](palette);

                            this.rebuild();
                            this.update();
                        });
                    // TODO: tiny swatches previews
                })
            )
            .classed('selected', d => this.paletteSet.has(d))
    }

    update() {
        console.log('UPDATE', this);

        if (this.paletteSet.size) {
            const palettes = [...this.paletteSet];
            // INFO: extension is determined by FormatExchange.chosen - changed by shelf buttons
            let code = FormatExchange.format(palettes);
            this.codefield.text(code);
            this.downloadButton.attr('disabled', null)
        } else {
            this.codefield.text(ExportModal.defaultCode);
            this.downloadButton.attr('disabled', true)
        }
    }

    download() {
        console.log('DOWNLOAD', this);

        const palettes = [...this.paletteSet];
        // const paletteNames = palettes.map(palette => palette.name).join('');
        const paletteNames = this.paletteSet.size === 1 ? palettes[0].name : 'MyHuebismPalettes';

        const extension = FormatExchange.chosen;
        const serialized = FormatExchange.format(palettes, extension);
        console.log(serialized);
        FileExchange.save(paletteNames + '.' + extension, serialized);
    }
}
