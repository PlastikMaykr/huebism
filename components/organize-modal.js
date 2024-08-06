import * as d3 from 'd3';
import './modal.css';
import { Swatch, Palette } from '../classes';

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
            .on('close', () => this.close())
            .on('mouseup', (event) => {
                // console.log(event);
                if (event.target !== this.dialog) return;
                this.dialog.close();
            })
            .append('button')
            .classed('close', true)
            .text('✖')
            .on('mouseup', () => this.dialog.close());

        this.openButton = openButton instanceof d3.selection ?
            openButton : d3.select(openButton);
        this.openButton.on('click', () => this.open());

        this.modal = d3.select(dialog).select('.modal');
        this.overview = this.modal.select('.overview')
            .call(attachDragHandle)
            .call(dragger, this);

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

        this.callback();
    }

    update() {
        this.overview.selectAll('div').remove();

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

        this.callback();
    }
}


function editableContent(element, property) {
    element
        .attr('contenteditable', 'false')
        .attr('spellcheck', 'false')
        .attr('tabindex', '0')
        .text(d => d[property])
        // .on('input', function (event) {
        //     console.log('input', event);
        // })
        // .on('click', function (event) {
        //     console.log('Click');
        //     event.preventDefault();
        //     d3.select(this).attr('contenteditable', 'true');
        // })
        .on('dblclick', function (event) {
            console.log('DoubleClick');
            event.preventDefault();
            d3.select(this).attr('contenteditable', 'true');
        })
        .on('keydown', function (event) {
            // console.log(event);
            if (event.code !== 'Enter') return;
            console.log('Enter', this);
            event.preventDefault();

            const selection = d3.select(this);
            const editable = selection.attr('contenteditable').toLowerCase() === 'true';

            if (editable) {
                selection.attr('contenteditable', 'false');
                this.blur();
            } else {
                selection.attr('contenteditable', 'true');
            }
        })
        .on('focus', function () {
            // console.log('focus', this);
            /* 
            const selection = d3.select(this);
            const datum = selection.datum();
            const text = selection.text();
            console.log({ datum, text });
             */
        })
        .on('blur', function () {
            // console.log('blur', this);

            const selection = d3.select(this);
            selection.attr('contenteditable', 'false');

            const datum = selection.datum();
            const text = selection.text();
            datum[property] = text;
            // console.log({ datum, text });
        });
}

let dragActive = false;
let dropZone = null;

const dragHandle = d3.create('div')
    .classed('drag-handle', true)
    .text('⋮')
    .node();

/** @param {d3.Selection} element */
function attachDragHandle(element) {
    element
        .on('mouseover', function (event) {
            // console.log(event);
            // const targetCondition = event.target.getAttribute('contenteditable') === 'false';
            const targetCondition = event.target.matches('.org-swatch');
            if (targetCondition) {
                if (dragActive) {
                    dropZone = event.target;
                } else {
                    event.target.append(dragHandle)
                }
            } else {
                dragHandle.remove();
                dropZone = null;
            }
        })
}

function dragger(overview, organizeModal) {
    /** @type {d3.Selection<HTMLDivElement, Swatch>} */
    let dragged = null;

    const bucket = d3.create('div')
        .classed('bucket', true)

    /** @param {d3.D3DragEvent} event */
    function dragstart(event) {
        console.log('dragStart', event);

        dragActive = true;

        dragged = d3.select(event.sourceEvent.target.parentNode)
            .style('display', 'none');

        const [x, y] = d3.pointer(event, this);

        this.append(bucket
            .style('left', x + 'px')
            .style('top', y + 'px')
            .style('background-color', dragged.style('background-color'))
            .node());
    }

    /** @param {d3.D3DragEvent} event */
    function dragging(event) {
        // console.log(event);
        const [x, y] = d3.pointer(event, this);

        bucket
            .style('left', x + 'px')
            .style('top', y + 'px')
            .style('background-color', dragged.style('background-color'));
    }

    /** @param {d3.D3DragEvent} event */
    function dragend(event) {
        console.log('dragEnd', event);

        dragged.style('display', null);
        bucket.remove();

        if (dropZone) {
            const dragSwatch = dragged.datum();

            /** @type {Swatch} */
            const dropSwatch = d3.select(dropZone).datum();
            dragSwatch.palette.swatches.splice(dragSwatch.getIndex(), 1);
            dragSwatch.palette = dropSwatch.palette;
            const index = dropSwatch.getIndex();
            dropSwatch.palette.swatches.splice(index, 0, dragSwatch);

            organizeModal.update();
        }

        dragged = null;

        dragActive = false;
    }

    return d3.drag()
        .filter(function (event) {
            // console.log(event);

            return (
                !event.ctrlKey &&
                !event.button &&
                event.originalTarget === dragHandle
                // event.originalTarget.getAttribute('contenteditable') === 'false'
            );
        })
        .on('start', dragstart)
        .on('drag', dragging)
        .on('end', dragend)
        (overview);
}
