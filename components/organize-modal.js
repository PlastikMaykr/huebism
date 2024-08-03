import * as d3 from 'd3';
import './modal.css';

export class OrganizeModal {
    static { }

    /** @type {HTMLDialogElement} */
    dialog;
    /** @type {d3.Selection} */
    openButton;
    /** @type {d3.Selection} */
    modal;
    /** @type {d3.Selection} */
    overview;
    /** @type {Function} */
    callback;

    constructor(dialog, openButton, callback) {
        this.dialog = dialog instanceof HTMLDialogElement ?
            dialog : document.querySelector(dialog);

        d3.select(this.dialog)
            .on('mouseup', (event) => {
                // console.log(event);
                if (event.target !== this.dialog) return;
                this.close();
            })
            .append('button')
            .classed('close', true)
            .text('✖')
            .on('mouseup', () => this.close());

        this.openButton = openButton instanceof d3.selection ?
            openButton : d3.select(openButton);
        this.openButton.on('click', () => this.open());

        this.modal = d3.select(dialog).select('.modal');
        this.overview = this.modal.select('.overview');

        this.callback = callback || (() => { });
    }

    open() {
        console.log('Organize');

        this.overview.selectAll('div')
            .data(Palette.collection)
            .join('div')
            .classed('org-wrapper', true)
            .call(wrapper => wrapper
                .append('p')
                .call(editableContent, 'name')
            )
            .append('div')
            .classed('org-palette', true)
            .selectAll('div')
            .data(d => d.swatches)
            .join('div')
            .classed('org-swatch', true)
            .style('background-color', d => d.color.formatHex())
            .call(editableContent, 'name');

        this.dialog.showModal();
    }

    close() {
        console.log('Done organizing');

        this.overview.selectAll('div').remove();
        this.dialog.close();

        this.callback();
    }
}


function editableContent(element, property) {
    element
        .attr('contenteditable', 'true')
        .attr('spellcheck', 'false')
        .text(d => d[property])
        // .on('input', function (event) {
        //     console.log('input', event);
        // })
        .on('keydown', function (event) {
            // console.log(event);
            if (event.code === 'Enter') {
                event.preventDefault();
                this.blur();
            }
        })
        .on('focus', function () {
            console.log('focus', this);

            const selection = d3.select(this);
            const datum = selection.datum();
            const text = selection.text();
            console.log({ datum, text });
        })
        .on('blur', function () {
            console.log('blur', this);

            const selection = d3.select(this);
            const datum = selection.datum();
            const text = selection.text();
            datum[property] = text;
            console.log({ datum, text });
        });
}
