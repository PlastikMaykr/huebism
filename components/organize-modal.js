import * as d3 from 'd3';
import './modal.css';

export class OrganizeModal {
    static { }

    /** @type {HTMLDialogElement} */
    dialog;
    /** @type {d3.Selection} */
    openButton;

    constructor(dialog, openButton) {
        this.dialog = dialog instanceof HTMLDialogElement ?
            dialog : document.querySelector(dialog);

        d3.select(this.dialog)
            .on('click', (event) => {
                // console.log(event);
                if (event.target !== this.dialog) return;
                this.close();
            })
            .append('button')
            .classed('close', true)
            .text('✖')
            .on('click', () => this.close());

        this.openButton = openButton instanceof d3.selection ?
            openButton : d3.select(openButton);
        this.openButton.on('click', () => this.open());

        this.modal = d3.select(dialog).select('.modal');
        this.overview = this.modal.select('.overview');
    }

    open() {
        console.log('Organize');

        this.overview.selectAll('div')
            .data(Palette.collection)
            .join('div')
            .text(d => d.name)
            .append('dl')
            .selectAll('dd')
            .data(d => d.swatches)
            .join('dd')
            .text(d => d.name);

        this.dialog.showModal();
    }

    close() {
        console.log('Done organizing');

        // TODO: update main grid displays

        this.dialog.close();
    }
}
